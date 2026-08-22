#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>



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
    Serial.print("[MQTT] Connecting as ");
    Serial.println(clientId);
    // Simple connect without LWT — avoids oversized CONNECT packet
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("[MQTT] Connected!");
      client.publish("smartnest/hub/status", "online", true);
      client.subscribe("smartnest/+/current");
      client.subscribe("smartnest/+/relay/state");
      client.subscribe("smartnest/+/alert");
    } else {
      Serial.print("[MQTT] Failed, rc=");
      Serial.println(client.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_R, OUTPUT); pinMode(LED_G, OUTPUT); pinMode(LED_B, OUTPUT);
  setRGB(false, false, true); // blue while connecting


  Wire.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("[WiFi] Connected.");

  // ── TLS configuration ─────────────────────────────────────────
  // setInsecure(): skips certificate verification.
  // The connection is still TLS-encrypted — data is protected in transit.
  espClient.setInsecure();
  client.setServer(mqtt_host, mqtt_port);
  client.setBufferSize(512);
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