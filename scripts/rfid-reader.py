#!/usr/bin/env python3

import json
import time
import urllib.request
import urllib.error

import RPi.GPIO as GPIO
from mfrc522 import MFRC522

API_URL = "http://127.0.0.1:3000/api/current-scan"

POLL_INTERVAL = 0.05
REARM_DELAY = 1.15

# Bij opstart: eerste tag die al op scanner ligt wordt genegeerd.
# Maar zodra er een andere tag komt, mag die eerste tag later opnieuw meetellen.
STARTUP_IGNORE_SECONDS = 2.0


def normalise_uid(value):
    return str(value or "").upper().replace(" ", "").strip()


def format_uid(uid_bytes):
    return "".join(f"{int(value) & 0xFF:02X}" for value in uid_bytes)


def send_scan(uid):
    payload = json.dumps({
        "uid": uid,
    }).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=2) as response:
            response.read()

        print(f"RFID gestuurd: {uid}")
        return True

    except urllib.error.HTTPError as error:
        print(f"RFID niet gestuurd. HTTP error: {error.code}")
        return False

    except Exception as error:
        print(f"RFID niet gestuurd: {error}")
        return False


def read_uid(reader):
    status, _ = reader.MFRC522_Request(reader.PICC_REQIDL)

    if status != reader.MI_OK:
        return ""

    status, uid_bytes = reader.MFRC522_Anticoll()

    if status != reader.MI_OK:
        return ""

    return normalise_uid(format_uid(uid_bytes))


def main():
    reader = MFRC522()

    last_sent_uid = ""
    ignored_startup_uid = ""
    start_time = time.time()
    startup_phase_done = False

    print("RFID reader actief.")
    print("Opstartbeveiliging actief.")
    print("Als er al een fossiel op de scanner ligt bij start, telt die eerst niet mee.")

    try:
        while True:
            uid = read_uid(reader)
            now = time.time()

            if not uid:
                time.sleep(POLL_INTERVAL)
                continue

            # Eerste seconden kijken of er al een fossiel op de scanner ligt.
            if not startup_phase_done:
                if not ignored_startup_uid:
                    ignored_startup_uid = uid
                    print(f"Opstart-tag genegeerd: {ignored_startup_uid}")

                if now - start_time < STARTUP_IGNORE_SECONDS:
                    time.sleep(POLL_INTERVAL)
                    continue

                startup_phase_done = True
                print("Opstartbeveiliging klaar. Andere tags mogen scannen.")

            # De fossiel die bij opstart al op scanner lag, mag niet direct meetellen.
            if ignored_startup_uid and uid == ignored_startup_uid:
                time.sleep(POLL_INTERVAL)
                continue

            # Zodra er een andere fossiel komt, geven we de opstart-tag terug vrij.
            # Dus later mag die eerste fossiel wel opnieuw meetellen.
            if ignored_startup_uid and uid != ignored_startup_uid:
                print(
                    f"Nieuwe tag na opstart gezien: {uid}. "
                    f"Opstart-tag {ignored_startup_uid} mag later opnieuw tellen."
                )
                ignored_startup_uid = ""

            # Zelfde tag blijft liggen: niet opnieuw blijven sturen.
            if uid == last_sent_uid:
                time.sleep(POLL_INTERVAL)
                continue

            if send_scan(uid):
                last_sent_uid = uid

            time.sleep(REARM_DELAY)

    except KeyboardInterrupt:
        print("RFID reader gestopt.")

    finally:
        GPIO.cleanup()


if __name__ == "__main__":
    main()