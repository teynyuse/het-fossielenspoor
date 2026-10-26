#include <Adafruit_NeoPixel.h>
#include <math.h>

// ========================================
// FOSSIELENSPOOR ESP32 - FINALE LED VERSIE
// Scan-zone + 8 fossiel LEDs
// ========================================

// Scan-zone LED-ring
#define SCAN_LED_PIN 18
#define SCAN_LED_COUNT 16

// Fossiel-leds
#define FOSSIL_LED_PIN 19
#define FOSSIL_LED_COUNT 8

Adafruit_NeoPixel scanLeds(
  SCAN_LED_COUNT,
  SCAN_LED_PIN,
  NEO_GRB + NEO_KHZ800
);

Adafruit_NeoPixel fossilLeds(
  FOSSIL_LED_COUNT,
  FOSSIL_LED_PIN,
  NEO_GRB + NEO_KHZ800
);

// ========================================
// HELDERHEID
// ========================================

const uint8_t SCAN_IDLE_MIN = 8;
const uint8_t SCAN_IDLE_MAX = 26;
const uint8_t SCAN_SCAN_MAX = 78;

const uint8_t FOSSIL_IDLE_MAX = 22;
const uint8_t FOSSIL_FOUND_SOLID = 45;
const uint8_t FOSSIL_REVEAL_MAX = 100;

const uint8_t MANUAL_SCAN_LEVEL = 32;
const uint8_t MANUAL_FOSSIL_LEVEL = 24;

// ========================================
// TIMING
// ========================================

const unsigned long SCAN_BREATH_DURATION = 3200;
const unsigned long SCAN_PULSE_DURATION = 1050;

const unsigned long FOSSIL_IDLE_TRAVEL_DURATION = 4800;
const unsigned long FOSSIL_REVEAL_DURATION = 2200;
const unsigned long FOSSIL_REVEAL_PULSE_DURATION = 650;

const unsigned long COMPLETE_STEP_DURATION = 170;

const unsigned long TEST_STEP_DURATION = 180;
const unsigned long RENDER_INTERVAL = 20;

const float TWO_PI_VALUE = 6.28318530718f;

// ========================================
// STATUS
// ========================================

bool fossilFound[FOSSIL_LED_COUNT] = {
  false, false, false, false,
  false, false, false, false
};

enum LightMode {
  NORMAL_MODE,
  MANUAL_ON_MODE,
  OFF_MODE
};

LightMode lightMode = NORMAL_MODE;

String incomingCommand = "";

int highlightedFossil = -1;

bool scanPulseActive = false;
bool completeAnimationActive = false;
bool testAnimationActive = false;

unsigned long scanPulseStartedAt = 0;
unsigned long fossilRevealStartedAt = 0;
unsigned long completeAnimationStartedAt = 0;
unsigned long testAnimationStartedAt = 0;
unsigned long lastRenderAt = 0;

// ========================================
// KLEUREN
// ========================================

uint32_t scanGold(uint8_t brightness) {
  return scanLeds.Color(
    brightness,
    (brightness * 42) / 100,
    (brightness * 5) / 100
  );
}

uint32_t fossilGold(uint8_t brightness) {
  return fossilLeds.Color(
    brightness,
    (brightness * 34) / 100,
    (brightness * 3) / 100
  );
}

// ========================================
// HULPFUNCTIES
// ========================================

uint8_t lerpBrightness(
  uint8_t minimum,
  uint8_t maximum,
  float progress
) {
  if (progress < 0.0f) {
    progress = 0.0f;
  }

  if (progress > 1.0f) {
    progress = 1.0f;
  }

  return (uint8_t)(
    minimum + ((maximum - minimum) * progress)
  );
}

float smoothPulse(
  unsigned long currentTime,
  unsigned long duration
) {
  float progress = (float)(currentTime % duration) / duration;

  return 0.5f - (0.5f * cosf(progress * TWO_PI_VALUE));
}

int foundFossilCount() {
  int count = 0;

  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    if (fossilFound[i]) {
      count++;
    }
  }

  return count;
}

void clearScanLeds() {
  scanLeds.clear();
  scanLeds.show();
}

void clearFossilLeds() {
  fossilLeds.clear();
  fossilLeds.show();
}

void setAllScanLeds(uint8_t brightness) {
  for (int i = 0; i < SCAN_LED_COUNT; i++) {
    scanLeds.setPixelColor(i, scanGold(brightness));
  }

  scanLeds.show();
}

void setAllFossilLeds(uint8_t brightness) {
  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    fossilLeds.setPixelColor(i, fossilGold(brightness));
  }

  fossilLeds.show();
}

// ========================================
// SCAN-ZONE
// ========================================

void renderScanZone(unsigned long now) {
  if (lightMode == OFF_MODE) {
    scanLeds.clear();
    scanLeds.show();
    return;
  }

  if (lightMode == MANUAL_ON_MODE) {
    setAllScanLeds(MANUAL_SCAN_LEVEL);
    return;
  }

  if (completeAnimationActive) {
    return;
  }

  if (scanPulseActive) {
    unsigned long elapsed = now - scanPulseStartedAt;

    if (elapsed >= SCAN_PULSE_DURATION) {
      scanPulseActive = false;
    } else {
      float progress = (float)elapsed / SCAN_PULSE_DURATION;
      float pulse = sinf(progress * 3.14159265f);

      uint8_t brightness = lerpBrightness(
        SCAN_IDLE_MAX,
        SCAN_SCAN_MAX,
        pulse
      );

      setAllScanLeds(brightness);
      return;
    }
  }

  float breath = smoothPulse(now, SCAN_BREATH_DURATION);

  uint8_t brightness = lerpBrightness(
    SCAN_IDLE_MIN,
    SCAN_IDLE_MAX,
    breath
  );

  setAllScanLeds(brightness);
}

// ========================================
// FOSSIEL LEDS
// ========================================

void renderTravellingFossilGlow(
  unsigned long now,
  unsigned long duration,
  uint8_t maximumBrightness
) {
  float position =
    ((float)(now % duration) / duration) * FOSSIL_LED_COUNT;

  fossilLeds.clear();

  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    float distance = fabsf((float)i - position);

    if (distance > FOSSIL_LED_COUNT / 2.0f) {
      distance = FOSSIL_LED_COUNT - distance;
    }

    float intensity = 1.0f - distance;

    if (intensity < 0.0f) {
      intensity = 0.0f;
    }

    uint8_t brightness = (uint8_t)(
      maximumBrightness * intensity
    );

    fossilLeds.setPixelColor(i, fossilGold(brightness));
  }

  fossilLeds.show();
}

void renderFoundFossilsSolid() {
  fossilLeds.clear();

  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    if (fossilFound[i]) {
      fossilLeds.setPixelColor(
        i,
        fossilGold(FOSSIL_FOUND_SOLID)
      );
    }
  }

  fossilLeds.show();
}

void renderHighlightedFossil(unsigned long now) {
  unsigned long elapsed = now - fossilRevealStartedAt;

  if (elapsed >= FOSSIL_REVEAL_DURATION) {
    highlightedFossil = -1;
    renderFoundFossilsSolid();
    return;
  }

  float pulse = smoothPulse(
    elapsed,
    FOSSIL_REVEAL_PULSE_DURATION
  );

  uint8_t brightness = lerpBrightness(
    FOSSIL_FOUND_SOLID,
    FOSSIL_REVEAL_MAX,
    pulse
  );

  fossilLeds.clear();

  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    if (fossilFound[i]) {
      fossilLeds.setPixelColor(
        i,
        fossilGold(FOSSIL_FOUND_SOLID)
      );
    }
  }

  if (
    highlightedFossil >= 0 &&
    highlightedFossil < FOSSIL_LED_COUNT
  ) {
    fossilLeds.setPixelColor(
      highlightedFossil,
      fossilGold(brightness)
    );
  }

  fossilLeds.show();
}

void renderCompleteAnimation(unsigned long now) {
  int step = (now - completeAnimationStartedAt) / COMPLETE_STEP_DURATION;
  int activeLed = step % FOSSIL_LED_COUNT;

  // Fossiel LEDs: duidelijke succes-loop.
  // Alles blijft aan, maar 1 LED en zijn buren worden veel feller.
  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    uint8_t brightness = 32;

    int distance = abs(i - activeLed);

    if (distance > FOSSIL_LED_COUNT / 2) {
      distance = FOSSIL_LED_COUNT - distance;
    }

    if (distance == 0) {
      brightness = 180;
    } else if (distance == 1) {
      brightness = 95;
    } else if (distance == 2) {
      brightness = 55;
    }

    fossilLeds.setPixelColor(
      i,
      fossilGold(brightness)
    );
  }

  fossilLeds.show();

  // Scan-zone: zachte draaiende animatie tijdens diploma scherm.
  for (int i = 0; i < SCAN_LED_COUNT; i++) {
    uint8_t brightness = 16;

    if ((i + step) % 8 == 0) {
      brightness = 82;
    } else if ((i + step) % 8 == 1) {
      brightness = 52;
    } else if ((i + step) % 8 == 2) {
      brightness = 30;
    }

    scanLeds.setPixelColor(
      i,
      scanGold(brightness)
    );
  }

  scanLeds.show();
}

void renderTestAnimation(unsigned long now) {
  const int totalSteps = SCAN_LED_COUNT + FOSSIL_LED_COUNT;
  unsigned long elapsed = now - testAnimationStartedAt;
  int step = elapsed / TEST_STEP_DURATION;

  if (step >= totalSteps) {
    testAnimationActive = false;
    return;
  }

  if (step < SCAN_LED_COUNT) {
    scanLeds.clear();
    fossilLeds.clear();

    scanLeds.setPixelColor(
      step,
      scanGold(70)
    );

    scanLeds.show();
    fossilLeds.show();

    return;
  }

  int fossilIndex = step - SCAN_LED_COUNT;

  scanLeds.clear();
  fossilLeds.clear();

  fossilLeds.setPixelColor(
    fossilIndex,
    fossilGold(80)
  );

  scanLeds.show();
  fossilLeds.show();
}

void renderFossilLeds(unsigned long now) {
  if (lightMode == OFF_MODE) {
    fossilLeds.clear();
    fossilLeds.show();
    return;
  }

  if (lightMode == MANUAL_ON_MODE) {
    setAllFossilLeds(MANUAL_FOSSIL_LEVEL);
    return;
  }

  if (testAnimationActive) {
    renderTestAnimation(now);
    return;
  }

  if (completeAnimationActive) {
    renderCompleteAnimation(now);
    return;
  }

  if (highlightedFossil >= 0) {
    renderHighlightedFossil(now);
    return;
  }

  if (foundFossilCount() > 0) {
    renderFoundFossilsSolid();
    return;
  }

  renderTravellingFossilGlow(
    now,
    FOSSIL_IDLE_TRAVEL_DURATION,
    FOSSIL_IDLE_MAX
  );
}

// ========================================
// COMMANDO FUNCTIES
// ========================================

void resetEverything() {
  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    fossilFound[i] = false;
  }

  highlightedFossil = -1;
  scanPulseActive = false;
  completeAnimationActive = false;
  testAnimationActive = false;
  lightMode = NORMAL_MODE;

  clearScanLeds();
  clearFossilLeds();

  Serial.println("ESP32: RESET");
}

void allLightsOff() {
  lightMode = OFF_MODE;

  clearScanLeds();
  clearFossilLeds();

  Serial.println("ESP32: ALL LIGHTS OFF");
}

void allLightsOn() {
  lightMode = MANUAL_ON_MODE;
  scanPulseActive = false;
  completeAnimationActive = false;
  testAnimationActive = false;
  highlightedFossil = -1;

  setAllScanLeds(MANUAL_SCAN_LEVEL);
  setAllFossilLeds(MANUAL_FOSSIL_LEVEL);

  Serial.println("ESP32: ALL LIGHTS ON - DIM");
}

void startTestLights() {
  lightMode = NORMAL_MODE;
  testAnimationActive = true;
  completeAnimationActive = false;
  highlightedFossil = -1;
  scanPulseActive = false;
  testAnimationStartedAt = millis();

  Serial.println("ESP32: TEST START");
}

void startCompleteAnimation() {
  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    fossilFound[i] = true;
  }

  lightMode = NORMAL_MODE;
  highlightedFossil = -1;
  scanPulseActive = false;
  completeAnimationActive = true;
  testAnimationActive = false;
  completeAnimationStartedAt = millis();

  for (int i = 0; i < FOSSIL_LED_COUNT; i++) {
    fossilLeds.setPixelColor(
      i,
      fossilGold(FOSSIL_FOUND_SOLID)
    );
  }

  fossilLeds.show();

  Serial.println("ESP32: COMPLETE - SUCCES ANIMATIE");
}

void scanFossil(int fossilNumber) {
  int fossilIndex = fossilNumber - 1;

  if (
    fossilIndex < 0 ||
    fossilIndex >= FOSSIL_LED_COUNT
  ) {
    Serial.println("ESP32: ONGELDIG FOSSIEL NUMMER");
    return;
  }

  lightMode = NORMAL_MODE;

  fossilFound[fossilIndex] = true;

  highlightedFossil = fossilIndex;
  fossilRevealStartedAt = millis();

  scanPulseActive = true;
  scanPulseStartedAt = millis();

  completeAnimationActive = false;
  testAnimationActive = false;

  Serial.print("ESP32: FOSSIEL GESCAND: ");
  Serial.println(fossilNumber);
}

// ========================================
// SERIAL COMMANDS
// ========================================

void handleCommand(String command) {
  command.trim();
  command.toUpperCase();

  if (command.length() == 0) {
    return;
  }

  Serial.print("ESP32 ONTVANGEN: ");
  Serial.println(command);

  if (command == "RESET") {
    resetEverything();
    return;
  }

  if (command == "IDLE") {
    lightMode = NORMAL_MODE;
    highlightedFossil = -1;
    scanPulseActive = false;
    completeAnimationActive = false;
    testAnimationActive = false;

    Serial.println("ESP32: IDLE");
    return;
  }

  if (command == "ON") {
    allLightsOn();
    return;
  }

  if (command == "OFF") {
    allLightsOff();
    return;
  }

  if (command == "TEST") {
    startTestLights();
    return;
  }

  if (command == "COMPLETE") {
    startCompleteAnimation();
    return;
  }

  if (command.startsWith("SCAN_")) {
    String numberText = command.substring(5);
    int fossilNumber = numberText.toInt();

    scanFossil(fossilNumber);
    return;
  }

  Serial.println("ESP32: ONBEKEND COMMAND");
}

// ========================================
// SETUP
// ========================================

void setup() {
  Serial.begin(115200);

  scanLeds.begin();
  fossilLeds.begin();

  scanLeds.setBrightness(255);
  fossilLeds.setBrightness(255);

  scanLeds.clear();
  fossilLeds.clear();

  scanLeds.show();
  fossilLeds.show();

  Serial.println("");
  Serial.println("==================================");
  Serial.println("FOSSIELENSPOOR ESP32 GESTART");
  Serial.println("GPIO18 = scan zone LEDs");
  Serial.println("GPIO19 = fossiel LEDs");
  Serial.println("Fossielen blijven aan tot RESET");
  Serial.println("Complete scherm toont succes animatie");
  Serial.println("==================================");

  resetEverything();
}

// ========================================
// LOOP
// ========================================

void loop() {
  unsigned long now = millis();

  while (Serial.available()) {
    char received = Serial.read();

    if (received == '\n' || received == '\r') {
      if (incomingCommand.length() > 0) {
        handleCommand(incomingCommand);
        incomingCommand = "";
      }
    } else {
      incomingCommand += received;

      if (incomingCommand.length() > 48) {
        incomingCommand = "";
      }
    }
  }

  if (now - lastRenderAt >= RENDER_INTERVAL) {
    lastRenderAt = now;

    if (testAnimationActive) {
      renderTestAnimation(now);
    } else if (completeAnimationActive) {
      renderCompleteAnimation(now);
    } else {
      renderScanZone(now);
      renderFossilLeds(now);
    }
  }
}