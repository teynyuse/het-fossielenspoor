export type AppSettings = {
  diplomaEnabled: boolean;
  audioEnabled: boolean;
  completionDurationSeconds: number;
  diplomaTitle: string;
  diplomaDescription: string;
  diplomaAudioPath: string;
  noDiplomaTitle: string;
  noDiplomaDescription: string;
  noDiplomaAudioPath: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  diplomaEnabled: true,
  audioEnabled: true,
  completionDurationSeconds: 18,
  diplomaTitle: "Proficiat!",
  diplomaDescription:
    "Je hebt alle fossielen gevonden. Je mag je diploma gaan halen.",
  diplomaAudioPath: "",
  noDiplomaTitle: "Alle fossielen gevonden!",
  noDiplomaDescription:
    "Goed gedaan. Je hebt alle fossielen van het Fossielenspoor gevonden.",
  noDiplomaAudioPath: "",
};

export function normaliseAppSettings(
  settings?: Partial<AppSettings> | null,
): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...(settings ?? {}),

    diplomaEnabled:
      typeof settings?.diplomaEnabled === "boolean"
        ? settings.diplomaEnabled
        : DEFAULT_APP_SETTINGS.diplomaEnabled,

    audioEnabled:
      typeof settings?.audioEnabled === "boolean"
        ? settings.audioEnabled
        : DEFAULT_APP_SETTINGS.audioEnabled,

    completionDurationSeconds:
      typeof settings?.completionDurationSeconds === "number"
        ? settings.completionDurationSeconds
        : DEFAULT_APP_SETTINGS.completionDurationSeconds,

    diplomaTitle:
      settings?.diplomaTitle || DEFAULT_APP_SETTINGS.diplomaTitle,

    diplomaDescription:
      settings?.diplomaDescription || DEFAULT_APP_SETTINGS.diplomaDescription,

    diplomaAudioPath:
      settings?.diplomaAudioPath || DEFAULT_APP_SETTINGS.diplomaAudioPath,

    noDiplomaTitle:
      settings?.noDiplomaTitle || DEFAULT_APP_SETTINGS.noDiplomaTitle,

    noDiplomaDescription:
      settings?.noDiplomaDescription ||
      DEFAULT_APP_SETTINGS.noDiplomaDescription,

    noDiplomaAudioPath:
      settings?.noDiplomaAudioPath ||
      DEFAULT_APP_SETTINGS.noDiplomaAudioPath,
  };
}
