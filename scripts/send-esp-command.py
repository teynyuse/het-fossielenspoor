#!/usr/bin/env python3

import sys
import time

import serial

PORT = "/dev/ttyUSB0"
BAUD_RATE = 115200

command = sys.argv[1].strip().upper() if len(sys.argv) > 1 else ""

if command not in {"RED", "OFF"}:
    raise SystemExit("Gebruik: RED of OFF")

with serial.Serial(PORT, BAUD_RATE, timeout=2) as esp:
    time.sleep(2)

    esp.reset_input_buffer()
    esp.write(f"{command}\n".encode("utf-8"))
    esp.flush()

    time.sleep(0.2)
    response = esp.read_all().decode("utf-8", errors="replace").strip()

print(f"Gestuurd naar ESP32: {command}")

if response:
    print(response)
