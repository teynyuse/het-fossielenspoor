import type { Fossil } from "../types/fossil";
import type { PendingMedia } from "../types/admin";
import { MAX_LED_NUMBER } from "./adminConstants";

export function normaliseLedNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);

  if (
    Number.isInteger(numberValue) &&
    numberValue >= 1 &&
    numberValue <= MAX_LED_NUMBER
  ) {
    return numberValue;
  }

  return fallback;
}

export function ensureFossilShape(
  fossil: Fossil,
  fallbackLedNumber = 1,
): Fossil {
  return {
    ...fossil,
    audioPath: fossil.audioPath ?? "",
    imagePaths: fossil.imagePaths ?? [],
    rfidUids: (fossil.rfidUids ?? []).slice(0, 1),
    ledNumber: normaliseLedNumber(fossil.ledNumber, fallbackLedNumber),
  };
}

export function makeFossilsSnapshot(fossils: Fossil[]) {
  return JSON.stringify(
    fossils.map((fossil, index) =>
      ensureFossilShape(fossil, index + 1),
    ),
  );
}

export function hasPendingMediaChanges(
  pendingMedia: Record<string, PendingMedia>,
) {
  return Object.values(pendingMedia).some((media) => {
    return Boolean(
      media.images ||
        media.audioFile ||
        media.audioPreviewUrl,
    );
  });
}