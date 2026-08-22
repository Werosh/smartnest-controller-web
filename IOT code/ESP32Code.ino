#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>

// ── ISRG Root X1 CA Certificate (Let's Encrypt) ───────────────
// HiveMQ Cloud uses TLS certificates issued by Let's Encrypt.
// The root of that chain is ISRG Root X1.
// Source: https://letsencrypt.org/certs/isrgrootx1.pem
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

const char* ssid      = "Redmi Note 13";
const char* password  = "inuka123";
const char* mqtt_host = "189f86ad4aab4e8cad170cd68d96d91b.s1.eu.hivemq.cloud";
const int   mqtt_port = 8883;
const char* mqtt_user = "WD20SmartNestV1";
const char* mqtt_pass = "WD20@sliit";

#define BUTTON_PIN 15
#define BUZZER_PIN 4
#define LED_R 25
#define LED_G 26
#define LED_B 27

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

WiFiClientSecure espClient;
PubSubClient client(espClient);

float current1 = 0, current2 = 0;
bool relay1 = false, relay2 = false;
bool alertActive = false;
bool oledOn = true;
unsigned long oledWakeTime = 0;
const unsigned long OLED_TIMEOUT_MS = 10000;

void setRGB(bool r, bool g, bool b) {
  // If your RGB LED turned out to be common-anode (see wiring notes above),
  // change this to: digitalWrite(LED_R, !r); digitalWrite(LED_G, !g); digitalWrite(LED_B, !b);
  digitalWrite(LED_R, r);
  digitalWrite(LED_G, g);
  digitalWrite(LED_B, b);
}

void updateDisplay() {
  if (!oledOn) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("SmartNest hub");
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  display.setCursor(0, 16);
  display.print("Ext1: "); display.print(current1, 2); display.print("A ");
  display.println(relay1 ? "ON" : "OFF");

  display.setCursor(0, 30);
  display.print("Ext2: "); display.print(current2, 2); display.print("A ");
  display.println(relay2 ? "ON" : "OFF");

  display.setCursor(0, 48);
  display.println(alertActive ? "ALERT ACTIVE" : "All normal");
  display.display();
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  String t = String(topic);

  if (t == "smartnest/smartnest01/current") current1 = msg.toFloat();
  else if (t == "smartnest/smartnest02/current") current2 = msg.toFloat();
  else if (t == "smartnest/smartnest01/relay/state") relay1 = (msg == "1");
  else if (t == "smartnest/smartnest02/relay/state") relay2 = (msg == "1");
  else if (t.endsWith("/alert")) {
    alertActive = true;
    setRGB(true, false, false);
    tone(BUZZER_PIN, 2000);
  }
  updateDisplay();
}

void reconnectMQTT() {
  while (!client.connected()) {
    String clientId = "smartnest-hub-" + String(random(0xffff), HEX);
    // last will: if the hub drops offline, the broker announces it automatically
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass,
                        "smartnest/hub/status", 0, true, "offline")) {
      client.publish("smartnest/hub/status", "online", true);
      client.subscribe("smartnest/+/current");
      client.subscribe("smartnest/+/relay/state");
      client.subscribe("smartnest/+/alert");
    } else {
      Serial.print("MQTT connect failed, rc=");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.print("user len: "); Serial.println(strlen(mqtt_user));
  Serial.print("pass len: "); Serial.println(strlen(mqtt_pass));
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT);
  setRGB(false, false, true); // blue while connecting

  configTime(5 * 3600 + 1800, 0, "pool.ntp.org");

  Wire.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);

  // ── TLS configuration ────────────────────────────────────────
  // setCACert() → validates the broker's certificate against ISRG Root X1.
  // NOTE: On ESP32 (mbedTLS), SNI is sent automatically based on the
  // hostname passed to connect() — no setHostname() call needed.
  espClient.setCACert(ROOT_CA);
  client.setServer(mqtt_host, mqtt_port);
  client.setCallback(mqttCallback);

  setRGB(false, true, false); // green once ready
  updateDisplay();
}

bool lastButtonState = HIGH;
unsigned long lastPress = 0;

void loop() {

  if (!client.connected()) reconnectMQTT();
  client.loop();

  bool buttonState = digitalRead(BUTTON_PIN);
 if (buttonState == LOW && lastButtonState == HIGH && millis() - lastPress > 300) {
  lastPress = millis();

  if (alertActive) {
    noTone(BUZZER_PIN);
    alertActive = false;
    setRGB(false, true, false);
  }

  if (!oledOn) {
    oledOn = true;
    display.ssd1306_command(SSD1306_DISPLAYON);
  }
  oledWakeTime = millis();
  updateDisplay();
  }

  lastButtonState = buttonState;

  if (oledOn && millis() - oledWakeTime > OLED_TIMEOUT_MS) {
    oledOn = false;
    display.ssd1306_command(SSD1306_DISPLAYOFF);
  }


}