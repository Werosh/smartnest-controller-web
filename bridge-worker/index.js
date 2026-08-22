/**
 * SmartNest V1 - MQTT Bridge Worker
 *
 * Modes:
 *   SIMULATOR: MQTT_URL not set OR SIMULATE_HARDWARE=true
 *   REAL MQTT: MQTT_URL set AND SIMULATE_HARDWARE != 'true'
 *
 * MQTT contract (topics agreed with hardware team):
 *   smartnest/<module-id>/current     ← device, payload: float string in Amps e.g. "0.42"
 *   smartnest/<module-id>/relay/state ← device, payload: "1" | "0"
 *   smartnest/<module-id>/relay/set   → device, payload: "1" | "0"
 *   smartnest/<module-id>/alert       ← device, payload: text
 *   smartnest/hub/status              ← hub, payload: "online" | "offline"
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
  MAINS_VOLTAGE = '230',
  SPIKE_THRESHOLD_WATTS = '1200',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  console.error('   Get service_role key from: Supabase Dashboard → Project Settings → API');
  process.exit(1);
}

const spikeThreshold = parseInt(SPIKE_THRESHOLD_WATTS, 10);
const mainsVoltage = parseInt(MAINS_VOLTAGE, 10);
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
console.log(`  Supabase URL      : ${SUPABASE_URL}`);
console.log(`  Mode              : ${useSimulator ? '🤖 SIMULATOR (mock hardware)' : '📡 REAL MQTT'}`);
// ── STEP 1 DEBUG: confirm .env values were loaded (password intentionally omitted) ──
console.log(`  [ENV] MQTT_URL        = ${MQTT_URL ?? '(not set)'}`);
console.log(`  [ENV] MQTT_USERNAME   = ${MQTT_USERNAME ?? '(not set)'}`);
console.log(`  [ENV] SIMULATE_HARDWARE = ${SIMULATE_HARDWARE ?? '(not set — defaults to real MQTT)'}`);
// ────────────────────────────────────────────────────────────────────────────────────
if (!useSimulator) {
  console.log(`  MQTT URL     : ${MQTT_URL}`);
}
console.log(`  Spike limit  : ${spikeThreshold}W`);
console.log('');

// ── SIMULATOR MODE ────────────────────────────────────────────
if (useSimulator) {
  console.log('[BRIDGE] Starting in SIMULATOR mode - no MQTT connection needed.');
  console.log('[BRIDGE] Toggle modules in the dashboard; current will update within ~4s.');
  await startSimulator(supabase, spikeThreshold, mainsVoltage);
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
    client.subscribe('smartnest/+/current', (err) => {
      if (err) console.error('[MQTT] Subscribe error (current):', err);
      else console.log('[MQTT] Subscribed to smartnest/+/current');
    });
    client.subscribe('smartnest/+/relay/state', (err) => {
      if (err) console.error('[MQTT] Subscribe error (relay/state):', err);
      else console.log('[MQTT] Subscribed to smartnest/+/relay/state');
    });
    client.subscribe('smartnest/+/alert', (err) => {
      if (err) console.error('[MQTT] Subscribe error (alert):', err);
      else console.log('[MQTT] Subscribed to smartnest/+/alert');
    });
    client.subscribe('smartnest/hub/status', (err) => {
      if (err) console.error('[MQTT] Subscribe error (hub/status):', err);
      else console.log('[MQTT] Subscribed to smartnest/hub/status');
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
    // ── STEP 3 DEBUG: raw log before any parsing — remove after debugging ──
    console.log(`[RAW MSG] topic="${topic}" payload="${payload.toString()}"`);
    // ──────────────────────────────────────────────────────────────────────
    const parts = topic.split('/');
    if (parts.length < 3 || parts[0] !== 'smartnest') return;

    const moduleId = parts[1];
    
    // Check for hub status
    if (moduleId === 'hub' && parts[2] === 'status') {
      const status = payload.toString().trim();
      const { error } = await supabase
        .from('hub_status')
        .upsert({ id: 'main', status, updated_at: new Date().toISOString() });
      if (error) console.error('[SUPABASE] hub_status upsert error:', error.message);
      else console.log(`[MQTT] Hub status → Supabase: ${status}`);
      return;
    }

    // parts[2] onwards will be 'current', 'relay/state', 'alert' etc.
    // However, it can be 3 or 4 parts e.g. relay/state
    const messageType = parts.slice(2).join('/');
    const value = payload.toString().trim();

    const now = new Date().toISOString();

    if (messageType === 'current') {
      const amps = parseFloat(value);
      if (isNaN(amps)) return;
      const watts = Math.round(amps * mainsVoltage);

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

      console.log(`[MQTT] ${moduleId} current: ${amps}A (${watts}W)`);
    }

    else if (messageType === 'relay/state') {
      const state = value === '1';
      await supabase
        .from('modules')
        .update({ state, updated_at: now })
        .eq('id', moduleId);
      console.log(`[MQTT] ${moduleId} state confirmed: ${value}`);
    }
    
    else if (messageType === 'alert') {
      const { data: mod } = await supabase
        .from('modules')
        .select('name')
        .eq('id', moduleId)
        .single();
      
      const alertMsg = `Device alert: ${value}`;
      await supabase.from('alerts').insert({
        module_id: moduleId,
        module_name: mod?.name ?? moduleId,
        type: 'device_alert',
        message: alertMsg,
        at: now,
      });
      console.log(`[MQTT] ⚡ ALERT from ${moduleId}: ${value}`);
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
        const cmd = desired_state ? '1' : '0';
        const topic = `smartnest/${id}/relay/set`;

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

      const topic = `smartnest/${m.id}/relay/set`;
      const cmd = newDesired ? '1' : '0';
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
