import { useEffect, useRef } from "react";
import type { AppSettings } from "../types/settings";
import "./CompletionScreen.css";

type CompletionScreenProps = {
  appSettings: AppSettings;
};

function CompletionScreen({ appSettings }: CompletionScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const audioPath = appSettings.diplomaEnabled
    ? appSettings.diplomaAudioPath
    : appSettings.noDiplomaAudioPath;

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !audioPath) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
    audio.src = audioPath;
    audio.volume = 1;
    audio.muted = false;
    audio.load();

    void audio.play().catch((error) => {
      console.warn("Eindscherm audio kon niet automatisch afspelen:", error);
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioPath]);

  return (
    <section className="completion-screen">
      <audio ref={audioRef} preload="auto" />

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
