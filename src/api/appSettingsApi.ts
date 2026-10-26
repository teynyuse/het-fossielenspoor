import {
  DEFAULT_APP_SETTINGS,
  normaliseAppSettings,
  type AppSettings,
} from "../types/settings";

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const response = await fetch("/api/settings", {
      cache: "no-store",
    });

    if (!response.ok) {
      return DEFAULT_APP_SETTINGS;
    }

    const data = await response.json();
    return normaliseAppSettings(data);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  const cleanSettings = normaliseAppSettings(settings);

  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleanSettings),
  });

  if (!response.ok) {
    throw new Error("Settings konden niet opgeslagen worden.");
  }

  const data = await response.json();
  return normaliseAppSettings(data);
}
