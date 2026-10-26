import { type ChangeEvent } from "react";
import type { Fossil } from "../../types/fossil";
import type {
  PendingAudioFiles,
} from "../../hooks/useAdminManager";

type AudioSectionProps = {
  selectedFossil: Fossil;
  pendingAudioFiles: PendingAudioFiles;
  cacheBuster: number;
  onChooseAudio: (event: ChangeEvent<HTMLInputElement>) => void;
};

function AudioSection({
  selectedFossil,
  pendingAudioFiles,
  cacheBuster,
  onChooseAudio,
}: AudioSectionProps) {
  const hasPendingAudio = Boolean(pendingAudioFiles[selectedFossil.id]);

  return (
    <section className="admin-subsection">
      <div className="admin-subsection-header">
        <div>
          <span>Audio</span>
          <h3>Audio bestand</h3>
        </div>

        <label className="admin-upload-button">
          Audio kiezen
          <input type="file" accept="audio/*" onChange={onChooseAudio} />
        </label>
      </div>

      {selectedFossil.audioPath ? (
        <div className="admin-current-media">
          <span>Huidig audiobestand</span>
          <strong>{selectedFossil.audioPath}</strong>
        </div>
      ) : (
        <p className="admin-empty-note">Nog geen audio gekoppeld.</p>
      )}

      {selectedFossil.audioPath && !hasPendingAudio && (
        <audio
          className="admin-audio-player"
          src={`${selectedFossil.audioPath}?v=${cacheBuster}`}
          controls
        />
      )}
    </section>
  );
}

export default AudioSection;
