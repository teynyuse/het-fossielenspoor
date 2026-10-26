import { useRef, useState } from "react";
import type { AppSettings } from "../../types/settings";

type CompletionSettingsPanelProps = {
  appSettings: AppSettings;
  onSettingChange: (
    key: keyof AppSettings,
    value: string | number | boolean,
  ) => void;
};

type UploadResult = {
  path: string;
};

async function uploadCompletionAudio(file: File, label: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", label);
  formData.append("slot", "1");

  const response = await fetch("/api/upload/audio", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Audio upload mislukt.");
  }

  return (await response.json()) as UploadResult;
}

function CompletionSettingsPanel({
  appSettings,
  onSettingChange,
}: CompletionSettingsPanelProps) {
  const diplomaAudioInputRef = useRef<HTMLInputElement | null>(null);
  const noDiplomaAudioInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadingDiplomaAudio, setIsUploadingDiplomaAudio] = useState(false);
  const [isUploadingNoDiplomaAudio, setIsUploadingNoDiplomaAudio] =
    useState(false);

  async function handleDiplomaAudioChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploadingDiplomaAudio(true);
      const result = await uploadCompletionAudio(file, "diploma-audio");
      onSettingChange("diplomaAudioPath", result.path);
    } catch {
      window.alert("Diploma audio uploaden is mislukt.");
    } finally {
      setIsUploadingDiplomaAudio(false);
      event.target.value = "";
    }
  }

  async function handleNoDiplomaAudioChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploadingNoDiplomaAudio(true);
      const result = await uploadCompletionAudio(file, "zonder-diploma-audio");
      onSettingChange("noDiplomaAudioPath", result.path);
    } catch {
      window.alert("Zonder diploma audio uploaden is mislukt.");
    } finally {
      setIsUploadingNoDiplomaAudio(false);
      event.target.value = "";
    }
  }

  return (
    <section className="completion-settings-panel">
      <h2>Eindscherm aanpassen</h2>

      <div className="completion-admin-section">
        <h3>Algemeen</h3>

        <div className="completion-admin-grid">
          <label className="completion-admin-field">
            <span>Diploma beloning</span>
            <select
              value={appSettings.diplomaEnabled ? "true" : "false"}
              onChange={(event) =>
                onSettingChange(
                  "diplomaEnabled",
                  event.target.value === "true",
                )
              }
            >
              <option value="true">Diploma aan</option>
              <option value="false">Diploma uit</option>
            </select>
          </label>

          <label className="completion-admin-field">
            <span>Duur eindscherm in seconden</span>
            <input
              type="number"
              min="5"
              max="60"
              value={appSettings.completionDurationSeconds}
              onChange={(event) =>
                onSettingChange(
                  "completionDurationSeconds",
                  Number(event.target.value),
                )
              }
            />
          </label>
        </div>
      </div>

      <div className="completion-admin-section">
        <h3>Met diploma</h3>

        <div className="completion-admin-grid">
          <label className="completion-admin-field">
            <span>Grote titel</span>
            <input
              type="text"
              value={appSettings.diplomaTitle}
              onChange={(event) =>
                onSettingChange("diplomaTitle", event.target.value)
              }
            />
          </label>

          <label className="completion-admin-field">
            <span>Beschrijving</span>
            <textarea
              value={appSettings.diplomaDescription}
              onChange={(event) =>
                onSettingChange("diplomaDescription", event.target.value)
              }
            />
          </label>
        </div>

        <div className="completion-audio-admin">
          <div className="completion-audio-info">
            <strong>Diploma audio</strong>
            <p>
              {appSettings.diplomaAudioPath
                ? appSettings.diplomaAudioPath
                : "Nog geen audio gekozen."}
            </p>
          </div>

          <div className="completion-audio-actions">
            {appSettings.diplomaAudioPath && (
              <audio controls src={appSettings.diplomaAudioPath} />
            )}

            <input
              ref={diplomaAudioInputRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={handleDiplomaAudioChange}
            />

            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => diplomaAudioInputRef.current?.click()}
              disabled={isUploadingDiplomaAudio}
            >
              {isUploadingDiplomaAudio ? "Uploaden..." : "Audio uploaden"}
            </button>

            {appSettings.diplomaAudioPath && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => onSettingChange("diplomaAudioPath", "")}
              >
                Audio verwijderen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="completion-admin-section">
        <h3>Zonder diploma</h3>

        <div className="completion-admin-grid">
          <label className="completion-admin-field">
            <span>Grote titel</span>
            <input
              type="text"
              value={appSettings.noDiplomaTitle}
              onChange={(event) =>
                onSettingChange("noDiplomaTitle", event.target.value)
              }
            />
          </label>

          <label className="completion-admin-field">
            <span>Beschrijving</span>
            <textarea
              value={appSettings.noDiplomaDescription}
              onChange={(event) =>
                onSettingChange("noDiplomaDescription", event.target.value)
              }
            />
          </label>
        </div>

        <div className="completion-audio-admin">
          <div className="completion-audio-info">
            <strong>Zonder diploma audio</strong>
            <p>
              {appSettings.noDiplomaAudioPath
                ? appSettings.noDiplomaAudioPath
                : "Nog geen audio gekozen."}
            </p>
          </div>

          <div className="completion-audio-actions">
            {appSettings.noDiplomaAudioPath && (
              <audio controls src={appSettings.noDiplomaAudioPath} />
            )}

            <input
              ref={noDiplomaAudioInputRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={handleNoDiplomaAudioChange}
            />

            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => noDiplomaAudioInputRef.current?.click()}
              disabled={isUploadingNoDiplomaAudio}
            >
              {isUploadingNoDiplomaAudio ? "Uploaden..." : "Audio uploaden"}
            </button>

            {appSettings.noDiplomaAudioPath && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => onSettingChange("noDiplomaAudioPath", "")}
              >
                Audio verwijderen
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CompletionSettingsPanel;
