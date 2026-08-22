/**
 * SmartNest V1 — NodeMCU (ESP8266) Firmware
 *
 * Changes from original:
 *   - REMOVED: espClient.setInsecure()
 *   - ADDED:   ISRG Root X1 CA certificate (HiveMQ Cloud uses Let's Encrypt)
 *   - ADDED:   espClient.setCACert()   → proper TLS chain verification
 *   - ADDED:   espClient.setHostname() → enables SNI (required by HiveMQ Cloud)
 *
 * HiveMQ Cloud mandates TLS + SNI. Without both, the TLS handshake is
 * rejected silently and the device appears "online" on WiFi but never
 * connects to the broker.
 */

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ── WiFi credentials ──────────────────────────────────────────
const char* ssid       = "Redmi Note 13";
const char* password   = "inuka123";

// ── HiveMQ Cloud broker ───────────────────────────────────────
const char* mqtt_host  = "189f86ad4aab4e8cad170cd68d96d91b.s1.eu.hivemq.cloud";
const int   mqtt_port  = 8883;
const char* mqtt_user  = "WD20SmartNestV1";
const char* mqtt_pass  = "WD20@sliit";

// ── Device identity ───────────────────────────────────────────
const char* DEVICE_ID  = "smartnest01"; // change to smartnest02 on the second unit

// ── Hardware pins ─────────────────────────────────────────────
#define RELAY_PIN   D1
#define ACS712_PIN  A0

// ── ACS712 calibration ────────────────────────────────────────
const float SENSITIVITY = 0.100; // 20A module: 100 mV/A
const float VREF        = 3.3;
const int   ADC_RES     = 1024;
float       zeroVoltage = 1.65;  // measure at zero-load per calibration guide

// ── Overcurrent safety ────────────────────────────────────────
const float MAX_SAFE_CURRENT       = 10.0; // amps
const int   OVERCURRENT_TRIP_READS = 5;
int         overCurrentCount       = 0;

bool relayState = false;

// ── ISRG Root X1 CA Certificate (Let's Encrypt) ───────────────
// HiveMQ Cloud uses TLS certificates issued by Let's Encrypt.
// The root of that chain is ISRG Root X1.
// Source: https://letsencrypt.org/certs/isrgrootx1.pem  (verified 2024-08)
// Stored in PROGMEM to save heap RAM on the ESP8266.
static const char ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// ── MQTT client setup ─────────────────────────────────────────
WiFiClientSecure espClient;
PubSubClient     client(espClient);

String topicCurrent, topicRelaySet, topicRelayState, topicAlert;

// ── Relay helper ──────────────────────────────────────────────
void setRelay(bool on) {
  relayState = on;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW); // flip HIGH/LOW if relay is active-LOW
  client.publish(topicRelayState.c_str(), on ? "1" : "0", true); // retained
}

// ── MQTT message callback ─────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  if (String(topic) == topicRelaySet) {
    setRelay(msg == "1");
  }
}

// ── MQTT reconnect loop ───────────────────────────────────────
void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connecting... ");
    String clientId = String(DEVICE_ID) + "-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("connected.");
      client.subscribe(topicRelaySet.c_str());
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" — retrying in 2s");
      delay(2000);
    }
  }
}

// ── Current sensor ────────────────────────────────────────────
float readCurrent() {
  long sum = 0;
  const int samples = 150;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(ACS712_PIN);
    delayMicroseconds(200);
  }
  float voltage = ((sum / (float)samples) / ADC_RES) * VREF;
  float current = (voltage - zeroVoltage) / SENSITIVITY;
  if (abs(current) < 0.05) current = 0;
  return current;
}

// ── setup() ───────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] SmartNest firmware starting...");

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // Build topic strings
  topicCurrent    = String("smartnest/") + DEVICE_ID + "/current";
  topicRelaySet   = String("smartnest/") + DEVICE_ID + "/relay/set";
  topicRelayState = String("smartnest/") + DEVICE_ID + "/relay/state";
  topicAlert      = String("smartnest/") + DEVICE_ID + "/alert";

  // Connect to WiFi
  Serial.print("[WiFi] Connecting to ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\n[WiFi] Connected. IP: ");
  Serial.println(WiFi.localIP());

  // ── TLS configuration ─────────────────────────────────────────
  // setCACert()   → validates the broker's certificate against ISRG Root X1.
  //                 Satisfies HiveMQ Cloud's requirement for authenticated TLS.
  // setHostname() → enables TLS SNI (Server Name Indication).
  //                 HiveMQ Cloud REQUIRES SNI; without it the broker selects
  //                 the wrong certificate and the handshake fails silently.
  espClient.setCACert(ROOT_CA);
  espClient.setHostname(mqtt_host); // SNI — REQUIRED by HiveMQ Cloud

  client.setServer(mqtt_host, mqtt_port);
  client.setCallback(mqttCallback);

  Serial.println("[TLS] CA certificate loaded. SNI enabled.");
  Serial.println("[MQTT] Ready to connect...");
}

// ── loop() ────────────────────────────────────────────────────
unsigned long lastPublish         = 0;
const unsigned long publishInterval = 5000; // ms

void loop() {
  if (!client.connected()) reconnectMQTT();
  client.loop();

  if (millis() - lastPublish >= publishInterval) {
    lastPublish = millis();
    float current = readCurrent();

    // Publish current reading
    String currentStr = String(current, 2);
    client.publish(topicCurrent.c_str(), currentStr.c_str());
    Serial.print("[PUB] ");
    Serial.print(topicCurrent);
    Serial.print(" -> ");
    Serial.println(currentStr);

    // Overcurrent safety cutoff
    if (current > MAX_SAFE_CURRENT) {
      overCurrentCount++;
      if (overCurrentCount >= OVERCURRENT_TRIP_READS && relayState) {
        setRelay(false);
        client.publish(topicAlert.c_str(), "overcurrent_cutoff");
        Serial.println("[ALERT] Overcurrent cutoff triggered!");
      }
    } else {
      overCurrentCount = 0;
    }
  }
}