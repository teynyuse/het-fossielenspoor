#!/usr/bin/env bash

cd /home/teynur/Desktop/fossil-scan || exit 1
mkdir -p logs

echo "[$(date '+%Y-%m-%d %H:%M:%S')] kiosk-autostart start" >> logs/kiosk-startup.log

sleep 8

bash scripts/start-kiosk.sh >> logs/kiosk-startup.log 2>&1
