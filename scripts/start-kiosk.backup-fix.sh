#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/logs"
PROFILE_DIR="$PROJECT_DIR/.kiosk-profile"
APP_URL="http://127.0.0.1:5173"

SERVER_PID=""
RFID_PID=""
ESP_PID=""
BROWSER_LOOP_PID=""

mkdir -p "$LOG_DIR" "$PROFILE_DIR" "$PROJECT_DIR/data"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

cleanup() {
  log "Kiosk wordt gestopt."

  kill "$BROWSER_LOOP_PID" 2>/dev/null || true
  kill "$RFID_PID" 2>/dev/null || true
  kill "$ESP_PID" 2>/dev/null || true
  kill "$SERVER_PID" 2>/dev/null || true

  pkill -f -- "$PROFILE_DIR" 2>/dev/null || true

  wait 2>/dev/null || true
}

wait_for_server() {
  for _ in $(seq 1 40); do
    if node -e "fetch('$APP_URL/api/fossils').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))" 2>/dev/null; then
      return 0
    fi

    sleep 0.5
  done

  return 1
}

find_browser() {
  command -v chromium ||
  command -v chromium-browser
}

browser_loop() {
  local browser="$1"

  while true; do
    "$browser" \
      --kiosk \
      --hide-scrollbars \
      --no-first-run \
      --no-default-browser-check \
      --noerrdialogs \
      --disable-infobars \
      --autoplay-policy=no-user-gesture-required \
      --disable-session-crashed-bubble \
      --password-store=basic \
      --user-data-dir="$PROFILE_DIR" \
      "$APP_URL" \
      >> "$LOG_DIR/chromium.log" 2>&1 || true

    sleep 3
  done
}

trap cleanup INT TERM EXIT

cd "$PROJECT_DIR"

log "Fossielenspoor kiosk start."

fuser -k 3000/tcp 2>/dev/null || true
pkill -f -- "$PROFILE_DIR" 2>/dev/null || true

rm -f \
  "$PROFILE_DIR/SingletonLock" \
  "$PROFILE_DIR/SingletonCookie" \
  "$PROFILE_DIR/SingletonSocket"

printf '{\n  "uid": "",\n  "time": 0\n}\n' \
  > "$PROJECT_DIR/data/current-scan.json"

if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  log "Geen productiebuild gevonden. Build wordt gemaakt."
  npm run build >> "$LOG_DIR/build.log" 2>&1
fi

log "Webserver starten."

node server/server.cjs \
  >> "$LOG_DIR/server.log" 2>&1 &

SERVER_PID=$!

if ! wait_for_server; then
  log "Webserver kon niet starten. Bekijk logs/server.log."
  exit 1
fi

log "Webserver is klaar."

if [ -x "$PROJECT_DIR/.venv/bin/python" ]; then
  log "RFID-reader starten."

  "$PROJECT_DIR/.venv/bin/python" \
    scripts/rfid-reader.py \
    >> "$LOG_DIR/rfid.log" 2>&1 &

  RFID_PID=$!

  log "ESP32-ledbridge starten."

  "$PROJECT_DIR/.venv/bin/python" \
    scripts/esp32-led-bridge.py \
    >> "$LOG_DIR/esp32.log" 2>&1 &

  ESP_PID=$!
else
  log "RFID-reader niet gestart: .venv ontbreekt."
fi

BROWSER="$(find_browser || true)"

# Muis verbergen in kiosk
unclutter -idle 0 -root &

if [ -z "$BROWSER" ]; then
  log "Chromium is niet gevonden."
  exit 1
fi

log "Chromium kiosk openen."

browser_loop "$BROWSER" &
BROWSER_LOOP_PID=$!

wait "$SERVER_PID"
