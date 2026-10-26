#!/usr/bin/env python3

import json
import time
from pathlib import Path

import serial
from serial.tools import list_ports

PROJECT_DIR = Path(__file__).resolve().parent.parent
FOSSILS_FILE = PROJECT_DIR / "public" / "data" / "fossils.json"
CURRENT_SCAN_FILE = PROJECT_DIR / "data" / "current-scan.json"

BAUD_RATE = 115200
CHECK_INTERVAL = 0.2


def normalise_uid(value):
    return "".join(
        character
        for character in str(value or "").upper()
        if character.isalnum() or character == "_"
    )


def load_json(file_path, fallback):
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def build_uid_mapping():
    store = load_json(FOSSILS_FILE, {"fossils": []})
    fossils = store.get("fossils", [])
    mapping = {}

    if not isinstance(fossils, list):
        return mapping

    for scan_number, fossil in enumerate(fossils, start=1):
        rfid_uids = fossil.get("rfidUids", [])

        if not isinstance(rfid_uids, list):
            continue

        for rfid_uid in rfid_uids:
            uid = normalise_uid(rfid_uid)

            if uid:
                mapping[uid] = scan_number

    return mapping


def find_esp_port():
    for port in list_ports.comports():
        device = port.device.lower()
        description = (port.description or "").lower()

        if (
            "ttyusb" in device
            or "ttyacm" in device
            or "ch340" in description
            or "cp210" in description
            or "esp32" in description
        ):
            return port.device

    return ""


def connect_esp():
    port = find_esp_port()

    if not port:
        print("ESP32 niet gevonden.")
        return None

    try:
        connection = serial.Serial(
            port,
            BAUD_RATE,
            timeout=1,
            write_timeout=1,
        )

        time.sleep(2)

        print(f"ESP32 verbonden op {port}")
        return connection
    except serial.SerialException as error:
        print(f"ESP32 kon niet openen: {error}")
        return None


def send_command(connection, command):
    try:
        connection.write(f"{command}\n".encode("utf-8"))
        connection.flush()

        print(f"ESP32 gestuurd: {command}")
        return True
    except (serial.SerialException, OSError) as error:
        print(f"ESP32-verbinding verloren: {error}")
        return False


def read_scan():
    scan = load_json(
        CURRENT_SCAN_FILE,
        {
            "uid": "",
            "time": 0,
        },
    )

    uid = normalise_uid(scan.get("uid"))
    scan_time = scan.get("time", 0)

    return uid, scan_time


def main():
    connection = None
    last_identifier = ""

    print("ESP32-ledbridge actief.")

    while True:
        if connection is None or not connection.is_open:
            connection = connect_esp()

            if connection is None:
                time.sleep(3)
                continue

            if not send_command(connection, "RESET"):
                connection = None
                continue

            uid, scan_time = read_scan()
            last_identifier = f"{uid}:{scan_time}"

        uid, scan_time = read_scan()
        identifier = f"{uid}:{scan_time}"

        if not uid or identifier == last_identifier:
            time.sleep(CHECK_INTERVAL)
            continue

        mapping = build_uid_mapping()
        scan_number = mapping.get(uid)

        if not scan_number:
            print(f"Onbekende RFID-tag: {uid}")
            last_identifier = identifier
            time.sleep(CHECK_INTERVAL)
            continue

        if send_command(connection, f"SCAN_{scan_number}"):
            last_identifier = identifier
        else:
            connection = None

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass