/**
 * SmartNest V1 - MQTT Bridge Worker
 *
 * Modes:
 *   SIMULATOR: MQTT_URL not set OR SIMULATE_HARDWARE=true
 *   REAL MQTT: MQTT_URL set AND SIMULATE_HARDWARE != 'true'
 *
 * MQTT contract (topics agreed with hardware team):
 *   smartnest/<module-id>/power  ← device, payload: watts as string e.g. "256"
 *   smartnest/<module-id>/state  ← device, payload: "ON" | "OFF"
 *   smartnest/<module-id>/cmd    → device, payload: "ON" | "OFF"
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { startSimulator } from './mockDevice.js';

// ── Validate required env vars ────────────────────────────────
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  SIMULATE_HARDWARE,
  SPIKE_THRESHOLD_WATTS = '1200',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  console.error('   Get service_role key from: Supabase Dashboard → Project Settings → API');
  process.exit(1);
}

const spikeThreshold = parseInt(SPIKE_THRESHOLD_WATTS, 10);
const useSimulator = !MQTT_URL || SIMULATE_HARDWARE === 'true';

// ── Create Supabase client (service role bypasses RLS) ────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║          SmartNest V1 - Bridge Worker        ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`  Supabase URL : ${SUPABASE_URL}`);
console.log(`  Mode         : ${useSimulator ? '🤖 SIMULATOR (mock hardware)' : '📡 REAL MQTT'}`);
if (!useSimulator) {
  console.log(`  MQTT URL     : ${MQTT_URL}`);
}
console.log(`  Spike limit  : ${spikeThreshold}W`);
console.log('');

// ── SIMULATOR MODE ────────────────────────────────────────────
if (useSimulator) {
  console.log('[BRIDGE] Starting in SIMULATOR mode - no MQTT connection needed.');
  console.log('[BRIDGE] Toggle modules in the dashboard; watts will update within ~4s.');
  await startSimulator(supabase, spikeThreshold);
}

// ── REAL MQTT MODE ────────────────────────────────────────────
else {
  const mqtt = await import('mqtt');

  console.log('[BRIDGE] Connecting to MQTT broker...');

  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME || undefined,
    password: MQTT_PASSWORD || undefined,
    rejectUnauthorized: true,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('[MQTT] Connected to broker.');

    // Subscribe to all device telemetry topics
    client.subscribe('smartnest/+/power', (err) => {
      if (err) console.error('[MQTT] Subscribe error (power):', err);
      else console.log('[MQTT] Subscribed to smartnest/+/power');
    });
    client.subscribe('smartnest/+/state', (err) => {
      if (err) console.error('[MQTT] Subscribe error (state):', err);
      else console.log('[MQTT] Subscribed to smartnest/+/state');
    });
  });

  client.on('error', (err) => {
    console.error('[MQTT] Connection error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
  });

  // ── Handle incoming MQTT messages ─────────────────────────
  client.on('message', async (topic, payload) => {
    // topic format: smartnest/<module-id>/power | smartnest/<module-id>/state
    const parts = topic.split('/');
    if (parts.length !== 3 || parts[0] !== 'smartnest') return;

    const moduleId = parts[1];
    const messageType = parts[2];
    const value = payload.toString().trim();

    const now = new Date().toISOString();

    if (messageType === 'power') {
      const watts = parseFloat(value);
      if (isNaN(watts)) return;

      // Update module watts
      const { error } = await supabase
        .from('modules')
        .update({ watts, updated_at: now })
        .eq('id', moduleId);

      if (error) {
        console.error(`[MQTT] Error updating watts for ${moduleId}:`, error.message);
        return;
      }

      // Insert reading
      await supabase.from('readings').insert({ module_id: moduleId, watts, at: now });

      // Check for spike
      if (watts > spikeThreshold) {
        const { data: mod } = await supabase
          .from('modules')
          .select('name')
          .eq('id', moduleId)
          .single();

        await supabase.from('alerts').insert({
          module_id: moduleId,
          module_name: mod?.name ?? moduleId,
          type: 'spike',
          message: `High consumption: ${moduleId} reported ${watts}W (threshold: ${spikeThreshold}W)`,
          at: now,
        });
        console.log(`[MQTT] ⚡ SPIKE alert: ${moduleId} → ${watts}W`);
      }

      console.log(`[MQTT] ${moduleId} power: ${watts}W`);
    }

    else if (messageType === 'state') {
      const state = value === 'ON';
      await supabase
        .from('modules')
        .update({ state, updated_at: now })
        .eq('id', moduleId);
      console.log(`[MQTT] ${moduleId} state confirmed: ${value}`);
    }
  });

  // ── Watch Supabase Realtime for desired_state changes ──────
  console.log('[SUPABASE] Subscribing to module changes via Realtime...');

  supabase
    .channel('modules-desired-state')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'modules' },
      (payload) => {
        const { id, desired_state } = payload.new;
        const cmd = desired_state ? 'ON' : 'OFF';
        const topic = `smartnest/${id}/cmd`;

        if (client.connected) {
          client.publish(topic, cmd, { qos: 1 }, (err) => {
            if (err) console.error(`[MQTT] Publish error for ${id}:`, err.message);
            else console.log(`[MQTT] Published ${topic} → ${cmd}`);
          });
        } else {
          console.warn(`[MQTT] Client not connected; could not send cmd to ${id}`);
        }
      }
    )
    .subscribe((status) => {
      console.log('[SUPABASE] Realtime status:', status);
    });

  // ── Timer check (every 10 seconds) ────────────────────────
  setInterval(async () => {
    const now = new Date();
    const { data: timedOut } = await supabase
      .from('modules')
      .select('*')
      .lte('timer_at', now.toISOString())
      .not('timer_at', 'is', null);

    for (const m of timedOut ?? []) {
      const newDesired = !m.desired_state;
      await supabase
        .from('modules')
        .update({ desired_state: newDesired, timer_at: null, updated_at: now.toISOString() })
        .eq('id', m.id);

      const topic = `smartnest/${m.id}/cmd`;
      const cmd = newDesired ? 'ON' : 'OFF';
      if (client.connected) {
        client.publish(topic, cmd, { qos: 1 });
        console.log(`[TIMER] ${m.id}: timer fired → ${cmd}`);
      }
    }
  }, 10_000);
}

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[BRIDGE] Received SIGTERM. Shutting down...');
  process.exit(0);
});
