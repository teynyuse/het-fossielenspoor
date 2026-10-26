#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$HOME/Desktop/fossil-scan"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/kiosk-autostart.log"
LOCK_FILE="/tmp/fossielenspoor-kiosk.lock"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

exec >> "$LOG_FILE" 2>&1

echo ""
echo "Kiosk-autostart: $(date)"

sleep 8

exec "$PROJECT_DIR/scripts/start-kiosk.sh"
