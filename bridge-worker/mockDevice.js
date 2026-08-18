/**
 * mockDevice.js - Hardware Simulator for SmartNest V1
 *
 * When SIMULATE_HARDWARE=true (or MQTT_URL is unset), this module runs
 * a periodic tick that:
 *  1. Syncs state ← desired_state so the UI toggle is responsive
 *  2. For every module with state=true, generates plausible wattage
 *  3. Has a 3% chance of a spike (3-5× base) → inserts an alert row
 *  4. Updates modules.watts and inserts into readings
 *  5. Checks timer_at and fires timers
 *
 * The frontend cannot distinguish this from real device data.
 */

const BASE_WATTS = { bulb: 60, fan: 75, outlet: 40 };
const TICK_MS = 4000;

/**
 * Add ±10% random variance to a wattage value.
 */
function jitter(base) {
  return base * (0.9 + Math.random() * 0.2);
}

/**
 * Start the hardware simulator.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} spikeThreshold - watts above which an alert is inserted
 * @param {number} mainsVoltage - voltage for converting Amps to Watts
 */
export async function startSimulator(supabase, spikeThreshold = 1200, mainsVoltage = 230) {
  console.log('[SIMULATOR] Mock hardware simulator starting...');
  console.log(`[SIMULATOR] Tick interval: ${TICK_MS}ms | Spike threshold: ${spikeThreshold}W | Voltage: ${mainsVoltage}V`);

  async function tick() {
    try {
      // ── 1. Fetch all modules ──────────────────────────────────
      const { data: modules, error } = await supabase
        .from('modules')
        .select('*');

      if (error) {
        console.error('[SIMULATOR] Error fetching modules:', error.message);
        return;
      }

      if (!modules || modules.length === 0) return;

      // ── 2. Sync state ← desired_state ─────────────────────────
      const stateChanges = modules.filter(m => m.state !== m.desired_state);
      for (const m of stateChanges) {
        await supabase
          .from('modules')
          .update({ state: m.desired_state, updated_at: new Date().toISOString() })
          .eq('id', m.id);
        console.log(`[SIMULATOR] ${m.id}: state synced → ${m.desired_state ? 'ON' : 'OFF'}`);
      }

      // ── 3. Handle timer expiry ────────────────────────────────
      const now = new Date();
      const timedOut = modules.filter(
        m => m.timer_at && new Date(m.timer_at) <= now
      );
      for (const m of timedOut) {
        const newDesired = !m.desired_state;
        await supabase
          .from('modules')
          .update({ desired_state: newDesired, timer_at: null, updated_at: now.toISOString() })
          .eq('id', m.id);
        console.log(`[SIMULATOR] ${m.id}: timer fired → desired_state=${newDesired}`);
      }

      // ── 4. Generate readings for ON modules ───────────────────
      // Re-fetch after state sync to get current state
      const activeModules = modules.filter(m => m.desired_state === true);

      for (const m of activeModules) {
        const baseW = BASE_WATTS[m.type] ?? 40;
        const isSpike = Math.random() < 0.03; // 3% chance
        const amps = isSpike
          ? jitter((baseW * (3 + Math.random() * 2)) / mainsVoltage) // 3–5× spike in Amps
          : jitter(baseW / mainsVoltage);

        // Convert Amps to Watts to match what index.js does for real hardware
        const watts = Math.round(amps * mainsVoltage);

        const roundedWatts = parseFloat(watts.toFixed(1));

        // Update module.watts
        await supabase
          .from('modules')
          .update({ watts: roundedWatts, updated_at: now.toISOString() })
          .eq('id', m.id);

        // Insert reading
        await supabase.from('readings').insert({
          module_id: m.id,
          watts: roundedWatts,
          at: now.toISOString(),
        });

        // Spike alert
        if (isSpike || roundedWatts > spikeThreshold) {
          const message = isSpike
            ? `Power spike detected on ${m.name}: ${roundedWatts}W (${Math.round(roundedWatts / baseW)}× normal)`
            : `High consumption on ${m.name}: ${roundedWatts}W exceeds threshold of ${spikeThreshold}W`;

          await supabase.from('alerts').insert({
            module_id: m.id,
            module_name: m.name,
            type: 'spike',
            message,
            at: now.toISOString(),
          });

          console.log(`[SIMULATOR] ⚡ SPIKE: ${m.id} → ${roundedWatts}W`);
        }
      }

      // ── 5. Zero out watts for OFF modules ─────────────────────
      const offModules = modules.filter(m => m.desired_state === false && m.watts > 0);
      for (const m of offModules) {
        await supabase
          .from('modules')
          .update({ watts: 0, updated_at: now.toISOString() })
          .eq('id', m.id);
      }

    } catch (err) {
      console.error('[SIMULATOR] Unexpected error in tick:', err);
    }
  }

  // Run immediately, then on interval
  await tick();
  return setInterval(tick, TICK_MS);
}
