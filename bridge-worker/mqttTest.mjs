/**
 * STEP 4 – Independent MQTT test subscriber
 * Uses the local mqtt package (no extra install needed).
 * Run: node mqttTest.mjs
 * Subscribes to smartnest/# and prints every message for 30 seconds, then exits.
 */
import { connect } from 'mqtt';

const BROKER = 'mqtts://189f86ad4aab4e8cad170cd68d96d91b.s1.eu.hivemq.cloud:8883';
const USER   = 'WD20SmartNestV1';
const PASS   = 'WD20@sliit';

console.log('[TEST] Connecting to broker as independent test client...');
const client = connect(BROKER, {
  username: USER,
  password: PASS,
  clientId: `smartnest-debug-${Date.now()}`,
  rejectUnauthorized: true,
});

client.on('connect', () => {
  console.log('[TEST] ✅ Connected to HiveMQ broker.');
  client.subscribe('smartnest/#', { qos: 1 }, (err) => {
    if (err) {
      console.error('[TEST] ❌ Subscribe error:', err.message);
    } else {
      console.log('[TEST] Subscribed to smartnest/# — waiting 30s for messages...');
    }
  });
});

client.on('message', (topic, payload) => {
  console.log(`[TEST] 📨 topic="${topic}"  payload="${payload.toString()}"`);
});

client.on('error', (err) => {
  console.error('[TEST] ❌ Connection error:', err.message);
});

// Auto-exit after 30 seconds
setTimeout(() => {
  console.log('[TEST] 30 seconds elapsed. No more messages. Exiting.');
  client.end();
  process.exit(0);
}, 30_000);
