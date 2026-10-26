#!/usr/bin/env bash

set -u

PROJECT_DIR="/home/teynur/Desktop/fossil-scan"
LOG_DIR="$PROJECT_DIR/logs"
PROFILE_DIR="$PROJECT_DIR/.kiosk-profile"
APP_URL="http://127.0.0.1:3000"

mkdir -p "$LOG_DIR" "$PROFILE_DIR" "$PROJECT_DIR/data"
cd "$PROJECT_DIR" || exit 1

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Fossielenspoor kiosk start."

export DISPLAY="${DISPLAY:-:0}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/1000}"
export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-1}"

log "DISPLAY=$DISPLAY"
log "XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"
log "WAYLAND_DISPLAY=$WAYLAND_DISPLAY"

pkill -f chromium 2>/dev/null || true
pkill -f server.cjs 2>/dev/null || true
pkill -f vite 2>/dev/null || true
pkill -f concurrently 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true

rm -f \
  "$PROFILE_DIR/SingletonLock" \
  "$PROFILE_DIR/SingletonCookie" \
  "$PROFILE_DIR/SingletonSocket"

printf '{\n  "uid": "",\n  "time": 0\n}\n' > "$PROJECT_DIR/data/current-scan.json"

if [ ! -f "$PROJECT_DIR/dist/index.html" ]; then
  log "Geen build gevonden. Build maken."
  npm run build >> "$LOG_DIR/build.log" 2>&1
fi

log "Server starten op poort 3000."
node server/server.cjs >> "$LOG_DIR/server.log" 2>&1 &

for i in $(seq 1 60); do
  if curl -fsS "$APP_URL/api/settings" >/dev/null 2>&1; then
    log "Server is klaar."
    break
  fi

  if [ "$i" = "60" ]; then
    log "Server reageert niet."
    tail -n 80 "$LOG_DIR/server.log" 2>/dev/null || true
    exit 1
  fi

  sleep 0.5
done

if [ -x "$PROJECT_DIR/.venv/bin/python" ]; then
  log "RFID-reader starten."
  "$PROJECT_DIR/.venv/bin/python" scripts/rfid-reader.py >> "$LOG_DIR/rfid.log" 2>&1 &

  log "ESP32-ledbridge starten."
  "$PROJECT_DIR/.venv/bin/python" scripts/esp32-led-bridge.py >> "$LOG_DIR/esp32.log" 2>&1 &
fi

if command -v unclutter >/dev/null 2>&1; then
  log "Muis verbergen."
  unclutter -idle 0 -root >> "$LOG_DIR/unclutter.log" 2>&1 &
fi

BROWSER="$(command -v chromium || command -v chromium-browser || true)"

if [ -z "$BROWSER" ]; then
  log "Chromium niet gevonden."
  exit 1
fi

log "Chromium openen op $APP_URL."

"$BROWSER" \
  --kiosk \
  --hide-scrollbars \
  --no-first-run \
  --no-default-browser-check \
  --noerrdialogs \
  --disable-infobars \
  --disable-extensions \
  --disable-speech-api \
  --disable-features=TranslateUI,AccessibilityLiveCaption,ReadAnything \
  --force-renderer-accessibility=false \
  --autoplay-policy=no-user-gesture-required \
  --disable-session-crashed-bubble \
  --password-store=basic \
  --user-data-dir="$PROFILE_DIR" \
  "$APP_URL" \
  >> "$LOG_DIR/chromium.log" 2>&1 &

log "Kiosk script klaar."
