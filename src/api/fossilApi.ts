import type { FossilsStore } from "../types/fossil";
import type { CurrentScan } from "../types/admin";
import {
  COMPLETE_UID,
  RESET_UID,
} from "../utils/scanConstants";
import { normaliseUid } from "../utils/rfid";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Data kon niet geladen worden.");
  }

  return response.json() as Promise<T>;
}

export async function getFossils() {
  return getJson<FossilsStore>("/api/fossils");
}

export async function getCurrentScan() {
  const scan = await getJson<CurrentScan>("/api/current-scan");

  return {
    uid: normaliseUid(scan.uid),
    time: Number(scan.time) || 0,
  };
}

export async function sendResetSignal() {
  await fetch("/api/current-scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid: RESET_UID,
    }),
  });
}

export async function sendCompleteSignal() {
  await fetch("/api/current-scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid: COMPLETE_UID,
    }),
  });
}