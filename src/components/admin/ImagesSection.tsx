import { type ChangeEvent } from "react";
import type { Fossil } from "../../types/fossil";
import {
  getImageForSlot,
  IMAGE_SLOT_COUNT,
  slugPreview,
  type PendingImagePreviews,
} from "../../hooks/useAdminManager";

type ImagesSectionProps = {
  selectedFossil: Fossil;
  pendingImagePreviews: PendingImagePreviews;
  cacheBuster: number;
  onChooseImageSlot: (
    event: ChangeEvent<HTMLInputElement>,
    slot: number,
  ) => void;
  onRemoveImageSlot: (slot: number) => void;
};

function ImagesSection({
  selectedFossil,
  pendingImagePreviews,
  cacheBuster,
  onChooseImageSlot,
  onRemoveImageSlot,
}: ImagesSectionProps) {
  return (
    <section className="admin-subsection">
      <div className="admin-subsection-header">
        <div>
          <span>Media</span>
          <h3>Afbeeldingen</h3>
        </div>
      </div>

      <p className="admin-empty-note">
        Kies of verwijder per slot. Alles wordt pas definitief wanneer je op
        Opslaan klikt.
      </p>

      <div className="admin-image-grid">
        {Array.from({ length: IMAGE_SLOT_COUNT }).map((_, index) => {
          const slot = index + 1;

          const savedImagePath = getImageForSlot(
            selectedFossil.imagePaths,
            slot,
          );

          const pendingPreview =
            pendingImagePreviews[selectedFossil.id]?.[slot];

          const previewPath = pendingPreview || savedImagePath;

          return (
            <article
              className={
                previewPath
                  ? "admin-image-card"
                  : "admin-image-card admin-image-card--empty"
              }
              key={slot}
            >
              <div className="admin-image-preview">
                {previewPath ? (
                  <img
                    src={
                      pendingPreview
                        ? pendingPreview
                        : `${previewPath}?v=${cacheBuster}`
                    }
                    alt={`${selectedFossil.name} ${slot}`}
                  />
                ) : (
                  <div className="admin-image-empty">
                    <strong>Afbeelding {slot}</strong>
                    <span>Nog leeg</span>
                  </div>
                )}
              </div>

              <div className="admin-image-info">
                <strong>Afbeelding {slot}</strong>
                <small>
                  {savedImagePath || `${slugPreview(selectedFossil.name)}_${slot}`}
                </small>
              </div>

              <div className="admin-image-actions">
                <label className="admin-image-upload-mini">
                  <span>{previewPath ? "Wijzig afbeelding" : "Upload afbeelding"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onChooseImageSlot(event, slot)}
                  />
                </label>

                <button
                  type="button"
                  className="admin-image-delete-button"
                  onClick={() => onRemoveImageSlot(slot)}
                  disabled={!previewPath}
                >
                  Verwijder
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ImagesSection;
