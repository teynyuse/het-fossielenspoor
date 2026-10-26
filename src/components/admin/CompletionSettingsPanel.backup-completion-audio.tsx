import type { AppSettings } from "../../types/settings";

type CompletionSettingsPanelProps = {
  appSettings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
};

function CompletionSettingsPanel({
  appSettings,
  onSettingChange,
}: CompletionSettingsPanelProps) {
  return (
    <section className="admin-editor admin-completion-editor">
      <div className="admin-editor-title">
        <h2>Eindscherm aanpassen</h2>
      </div>

      <section className="admin-subsection admin-subsection--first">
        <div className="admin-subsection-header">
          <h3>Algemeen</h3>
        </div>

        <div className="admin-form-grid">
          <label>
            Diploma beloning
            <select
              value={appSettings.diplomaEnabled ? "on" : "off"}
              onChange={(event) =>
                onSettingChange("diplomaEnabled", event.target.value === "on")
              }
            >
              <option value="on">Diploma aan</option>
              <option value="off">Diploma uit</option>
            </select>
          </label>

          <label>
            Duur eindscherm in seconden
            <input
              type="number"
              min={5}
              max={60}
              value={appSettings.completionDurationSeconds}
              onChange={(event) =>
                onSettingChange(
                  "completionDurationSeconds",
                  Math.max(5, Math.min(60, Number(event.target.value) || 18)),
                )
              }
            />
          </label>
        </div>
      </section>

      <section className="admin-subsection">
        <div className="admin-subsection-header">
          <div>
            <h3>Met diploma</h3>
          </div>
        </div>
        <label className="admin-full-field">
          Grote titel
          <input
            value={appSettings.diplomaTitle}
            onChange={(event) =>
              onSettingChange("diplomaTitle", event.target.value)
            }
          />
        </label>

        <label className="admin-full-field">
          Beschrijving
          <textarea
            rows={5}
            value={appSettings.diplomaDescription}
            onChange={(event) =>
              onSettingChange("diplomaDescription", event.target.value)
            }
          />
        </label>
      </section>

      <section className="admin-subsection">
        <div className="admin-subsection-header">
          <div>
            <h3>Zonder diploma</h3>
          </div>
        </div>

        <label className="admin-full-field">
          Grote titel
          <input
            value={appSettings.noDiplomaTitle}
            onChange={(event) =>
              onSettingChange("noDiplomaTitle", event.target.value)
            }
          />
        </label>

        <label className="admin-full-field">
          Beschrijving
          <textarea
            rows={5}
            value={appSettings.noDiplomaDescription}
            onChange={(event) =>
              onSettingChange("noDiplomaDescription", event.target.value)
            }
          />
        </label>
      </section>
    </section>
  );
}

export default CompletionSettingsPanel;
