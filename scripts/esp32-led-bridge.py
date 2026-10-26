#!/usr/bin/env python3

import json
import os
import time
import urllib.request
import urllib.error

import serial
import serial.tools.list_ports

API_URL = "http://127.0.0.1:3000/api/current-scan"
FOSSILS_JSON_PATH = "public/data/fossils.json"

BAUD_RATE = 115200
CHECK_INTERVAL = 0.2
MAX_LED_NUMBER = 8

RESET_UID = "__RESET__"
COMPLETE_UID = "__COMPLETE__"


def normalise_uid(value):
    return str(value or "").upper().replace(" ", "").strip()


def find_esp32_port():
    ports = list(serial.tools.list_ports.comports())

    preferred_keywords = [
        "USB",
        "UART",
        "CP210",
        "CH340",
        "ESP32",
    ]

    for port in ports:
        port_text = f"{port.device} {port.description} {port.manufacturer}".upper()

        if any(keyword in port_text for keyword in preferred_keywords):
            return port.device

    if ports:
        return ports[0].device

    return ""


def connect_esp32():
    port = find_esp32_port()

    if not port:
        print("Geen ESP32 poort gevonden.")
        return None

    try:
        connection = serial.Serial(port, BAUD_RATE, timeout=1)
        time.sleep(2)

        print(f"Verbonden met ESP32 op {port}")
        return connection

    except Exception as error:
        print(f"Kan niet verbinden met ESP32 op {port}: {error}")
        return None


def send_command(connection, command):
    if connection is None:
        return False

    try:
        message = f"{command}\n".encode("utf-8")
        connection.write(message)
        connection.flush()

        print(f"ESP32 gestuurd: {command}")
        return True

    except Exception as error:
        print(f"ESP32 command mislukt ({command}): {error}")
        return False


def get_current_scan():
    try:
        request = urllib.request.Request(
            API_URL,
            headers={
                "Cache-Control": "no-store",
            },
            method="GET",
        )

        with urllib.request.urlopen(request, timeout=2) as response:
            data = json.loads(response.read().decode("utf-8"))

        uid = normalise_uid(data.get("uid"))
        scan_time = int(data.get("time") or 0)

        return {
            "uid": uid,
            "time": scan_time,
        }

    except Exception as error:
        print(f"Current scan lezen mislukt: {error}")

        return {
            "uid": "",
            "time": 0,
        }


def load_fossils():
    try:
        with open(FOSSILS_JSON_PATH, "r", encoding="utf-8") as file:
            data = json.load(file)

        fossils = data.get("fossils", [])

        if not isinstance(fossils, list):
            return []

        return fossils

    except Exception as error:
        print(f"Fossielen JSON lezen mislukt: {error}")
        return []


def build_uid_mapping():
    fossils = load_fossils()
    mapping = {}

    for index, fossil in enumerate(fossils):
        led_number = fossil.get("ledNumber")

        if not isinstance(led_number, int):
            led_number = index + 1

        led_number = max(1, min(MAX_LED_NUMBER, led_number))

        rfid_uids = fossil.get("rfidUids", [])

        if not isinstance(rfid_uids, list):
            rfid_uids = []

        for uid in rfid_uids:
            clean_uid = normalise_uid(uid)

            if clean_uid:
                mapping[clean_uid] = led_number

    return mapping


def main():
    os.chdir(os.path.expanduser("~/Desktop/fossil-scan"))

    connection = connect_esp32()
    last_identifier = ""
    scan_locked = False

    print("ESP32 LED bridge actief.")
    print("Wacht op RFID scans...")

    try:
        while True:
            if connection is None:
                connection = connect_esp32()
                time.sleep(1)
                continue

            scan = get_current_scan()
            uid = scan["uid"]
            scan_time = scan["time"]
            identifier = f"{uid}:{scan_time}"

            if not uid or identifier == last_identifier:
                time.sleep(CHECK_INTERVAL)
                continue

            if uid == RESET_UID:
                print("Reset-signaal ontvangen.")
                scan_locked = False

                if send_command(connection, "RESET"):
                    last_identifier = identifier
                else:
                    connection = None

                time.sleep(CHECK_INTERVAL)
                continue

            if uid == COMPLETE_UID:
                print("Complete-signaal ontvangen. Scans worden geblokkeerd tot reset.")
                scan_locked = True

                if send_command(connection, "COMPLETE"):
                    last_identifier = identifier
                else:
                    connection = None

                time.sleep(CHECK_INTERVAL)
                continue

            if scan_locked:
                print(f"Scan genegeerd tijdens diploma scherm: {uid}")
                last_identifier = identifier
                time.sleep(CHECK_INTERVAL)
                continue

            mapping = build_uid_mapping()
            led_number = mapping.get(uid)

            if not led_number:
                print(f"Geen LED gevonden voor UID: {uid}")
                last_identifier = identifier
                time.sleep(CHECK_INTERVAL)
                continue

            command = f"SCAN_{led_number}"

            if send_command(connection, command):
                print(f"RFID {uid} → LED {led_number}")
                last_identifier = identifier
            else:
                connection = None

            time.sleep(CHECK_INTERVAL)

    except KeyboardInterrupt:
        print("ESP32 LED bridge gestopt.")

    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    main()