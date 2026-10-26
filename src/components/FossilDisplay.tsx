import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Fossil } from "../types/fossil";
import "./FossilDisplay.css";

type FossilDisplayProps = {
  fossil: Fossil;
  audioEnabled?: boolean;
  onAudioEnded?: (fossilId: string) => void;
  onAudioFailed?: (fossilId: string) => void;
};

const IMAGE_SLIDE_TIME_MS = 6500;

function FossilDisplay({
  fossil,
  audioEnabled = true,
  onAudioEnded,
  onAudioFailed,
}: FossilDisplayProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const onAudioEndedRef =
    useRef<((fossilId: string) => void) | undefined>(onAudioEnded);
  const onAudioFailedRef =
    useRef<((fossilId: string) => void) | undefined>(onAudioFailed);

  const images = useMemo(() => {
    return Array.isArray(fossil.imagePaths)
      ? fossil.imagePaths.filter(Boolean)
      : [];
  }, [fossil.imagePaths]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    onAudioEndedRef.current = onAudioEnded;
  }, [onAudioEnded]);

  useEffect(() => {
    onAudioFailedRef.current = onAudioFailed;
  }, [onAudioFailed]);

  useEffect(() => {
    setActiveImageIndex(0);
    setBrokenImages({});
  }, [fossil.id]);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((currentIndex) => {
        return (currentIndex + 1) % images.length;
      });
    }, IMAGE_SLIDE_TIME_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [images.length]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    let cancelled = false;

    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;

    if (!audioEnabled) {
      return;
    }

    if (!fossil.audioPath) {
      onAudioFailedRef.current?.(fossil.id);
      return;
    }

    const startAudio = async () => {
      try {
        audio.src = fossil.audioPath || "";
        audio.volume = 1;
        audio.muted = false;
        audio.currentTime = 0;
        audio.load();

        await audio.play();
      } catch (error) {
        console.warn("Audio kon niet automatisch afspelen:", error);

        if (!cancelled) {
          onAudioFailedRef.current?.(fossil.id);
        }
      }
    };

    void startAudio();

    return () => {
      cancelled = true;
      audio.pause();
      audio.currentTime = 0;
    };
  }, [fossil.id, fossil.audioPath, audioEnabled]);

  const activeImage = images[activeImageIndex] ?? "";
  const isActiveImageBroken = activeImage ? brokenImages[activeImage] : false;

  return (
    <article className="fossil-layout">
      <audio
        ref={audioRef}
        preload="auto"
        onEnded={() => {
          onAudioEndedRef.current?.(fossil.id);
        }}
      />

      <section className="fossil-visual">
        <div className="fossil-image-frame">
          {activeImage && !isActiveImageBroken ? (
            <>
              <img
                key={`${fossil.id}-${activeImageIndex}-${activeImage}-bg`}
                className="fossil-image-bg"
                src={activeImage}
                alt=""
                aria-hidden="true"
              />

              <img
                key={`${fossil.id}-${activeImageIndex}-${activeImage}`}
                className="fossil-image"
                src={activeImage}
                alt={fossil.name}
                onError={() =>
                  setBrokenImages((current) => ({
                    ...current,
                    [activeImage]: true,
                  }))
                }
              />
            </>
          ) : (
            <div className="fossil-placeholder">
              <span>Fossiel</span>
              <strong>{fossil.name}</strong>
              <p>
                Geen afbeelding gevonden. Controleer het afbeeldingspad in het
                adminpanel.
              </p>
            </div>
          )}

          <div className="fossil-image-counter">
            <span>{String(activeImageIndex + 1).padStart(2, "0")}</span>
            <span className="fossil-image-counter-line" />
            <span>{String(Math.max(images.length, 1)).padStart(2, "0")}</span>
          </div>
        </div>

        <div
          className="fossil-progress"
          style={
            {
              "--slide-duration": `${IMAGE_SLIDE_TIME_MS}ms`,
            } as CSSProperties
          }
        >
          {Array.from({ length: Math.max(images.length, 1) }).map((_, index) => (
            <span
              key={`${fossil.id}-progress-${index}-${activeImageIndex}`}
              className={index === activeImageIndex ? "is-active" : ""}
            />
          ))}
        </div>
      </section>

      <section className="fossil-content">
        <h2>{fossil.name}</h2>

        <div className="fossil-meta">
          <div className="fossil-meta-item">
            <span>Periode</span>
            <strong>{fossil.period}</strong>
          </div>

          <div className="fossil-meta-item">
            <span>Leeftijd</span>
            <strong>{fossil.age}</strong>
          </div>
        </div>

        <p className="fossil-description">{fossil.shortDescription}</p>
      </section>
    </article>
  );
}

export default FossilDisplay;
