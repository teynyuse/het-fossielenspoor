import type { AppSettings } from "../types/settings";
import "./CompletionScreen.css";

type CompletionScreenProps = {
  appSettings: AppSettings;
};

function CompletionScreen({ appSettings }: CompletionScreenProps) {
  const durationSeconds = Math.max(
    5,
    Math.min(60, Number(appSettings.completionDurationSeconds) || 18),
  );
  
  const title = appSettings.diplomaEnabled
    ? appSettings.diplomaTitle
    : appSettings.noDiplomaTitle;

  const description = appSettings.diplomaEnabled
    ? appSettings.diplomaDescription
    : appSettings.noDiplomaDescription;

  return (
    <section className="completion-screen">
      <div className="completion-copy">
        <div className="completion-brand">
          <strong>Kina</strong>
          <span>Museum voor kind en natuur</span>
        </div>

        <h1>{title}</h1>

        <p className="completion-description">{description}</p>

        <div className="completion-timer">
          <span style={{ animationDuration: `${durationSeconds}s` }} />
        </div>
      </div>
    </section>
  );
}

export default CompletionScreen;
