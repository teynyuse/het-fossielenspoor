import type { Fossil, FossilsStore } from "../types/fossil";
import type { CurrentScan } from "../types/admin";
import { RESET_UID } from "../utils/adminConstants";
import { normaliseUid } from "../utils/rfid";
import { ensureFossilShape } from "../utils/adminFossils";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Data kon niet geladen worden.");
  }

  return response.json() as Promise<T>;
}

export async function loadFossilsFromServer() {
  const store = await getJson<FossilsStore>("/api/fossils");

  return store.fossils.map((fossil, index) =>
    ensureFossilShape(fossil, index + 1),
  );
}

export async function saveFossilsToServer(updatedFossils: Fossil[]) {
  const response = await fetch("/api/fossils", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fossils: updatedFossils,
    }),
  });

  if (!response.ok) {
    throw new Error("Fossielen konden niet opgeslagen worden.");
  }
}

export async function getCurrentScan() {
  const scan = await getJson<CurrentScan>("/api/current-scan");

  return {
    uid: normaliseUid(scan.uid),
    time: Number(scan.time) || 0,
  };
}

export async function resetCurrentScanOnServer() {
  const response = await fetch("/api/current-scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid: RESET_UID,
    }),
  });

  if (!response.ok) {
    throw new Error("Reset kon niet doorgestuurd worden.");
  }
}