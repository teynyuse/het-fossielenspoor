import { useState } from "react";
import { useAdminManager } from "../hooks/useAdminManager";
import AdminPageHeader from "../components/admin/AdminPageHeader";
import AdminFossilSidebar from "../components/admin/AdminFossilSidebar";
import FossilBasicForm from "../components/admin/FossilBasicForm";
import AudioSection from "../components/admin/AudioSection";
import RfidSection from "../components/admin/RfidSection";
import ImagesSection from "../components/admin/ImagesSection";
import CompletionSettingsPanel from "../components/admin/CompletionSettingsPanel";
import "./AdminPage.css";

type AdminTab = "fossils" | "completion";

function AdminPage() {
  const admin = useAdminManager();
  const [activeTab, setActiveTab] = useState<AdminTab>("fossils");

  return (
    <main className="admin-page">
      <AdminPageHeader
        isSaving={admin.isSaving}
        hasUnsavedChanges={admin.hasUnsavedChanges}
        audioEnabled={admin.appSettings.audioEnabled}
        onToggleAudio={() => {
          admin.handleAppSettingChange(
            "audioEnabled",
            !admin.appSettings.audioEnabled,
          );
        }}
        onOpenScanPage={admin.handleOpenScanPage}
        onPreviewDiplomaScreen={async () => {
          await fetch(`http://${window.location.hostname}:3000/api/preview-completion`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ mode: "diploma" }),
          });
        }}
        onPreviewNoDiplomaScreen={async () => {
          await fetch(`http://${window.location.hostname}:3000/api/preview-completion`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ mode: "no-diploma" }),
          });
        }}
        onResetFlow={admin.handleResetFlow}
        onSave={admin.handleSave}
      />

      <nav className="admin-tabs" aria-label="Admin tabs">
        <button
          type="button"
          className={
            activeTab === "fossils"
              ? "admin-tab admin-tab--active"
              : "admin-tab"
          }
          onClick={() => setActiveTab("fossils")}
        >
          Fossielen
        </button>

        <button
          type="button"
          className={
            activeTab === "completion"
              ? "admin-tab admin-tab--active"
              : "admin-tab"
          }
          onClick={() => setActiveTab("completion")}
        >
          Eindscherm
        </button>
      </nav>

      {admin.message && <p className="admin-message">{admin.message}</p>}

      {activeTab === "fossils" && (
        <section className="admin-layout">
          <AdminFossilSidebar
            fossils={admin.fossils}
            selectedFossilId={admin.selectedFossilId}
            onSelectFossil={admin.handleSelectFossil}
          />

          <section className="admin-editor">
            {admin.selectedFossil ? (
              <>
                <FossilBasicForm
                  selectedFossil={admin.selectedFossil}
                  onTextChange={admin.handleTextChange}
                  onLedChange={admin.handleLedChange}
                />

                <AudioSection
                  selectedFossil={admin.selectedFossil}
                  pendingAudioFiles={admin.pendingAudioFiles}
                  cacheBuster={admin.cacheBuster}
                  onChooseAudio={admin.handleChooseAudio}
                />

                <RfidSection
                  selectedFossil={admin.selectedFossil}
                  newRfidUid={admin.newRfidUid}
                  lastScanUid={admin.lastScanUid}
                  onNewRfidUidChange={admin.setNewRfidUid}
                  onAddRfidUid={admin.handleAddRfidUid}
                  onAddLastScanAsRfid={admin.handleAddLastScanAsRfid}
                  onRemoveRfidUid={admin.handleRemoveRfidUid}
                />

                <ImagesSection
                  selectedFossil={admin.selectedFossil}
                  pendingImagePreviews={admin.pendingImagePreviews}
                  cacheBuster={admin.cacheBuster}
                  onChooseImageSlot={admin.handleChooseImageSlot}
                  onRemoveImageSlot={admin.handleRemoveImageSlot}
                />
              </>
            ) : (
              <p>Geen fossiel geselecteerd.</p>
            )}
          </section>
        </section>
      )}

      {activeTab === "completion" && (
        <CompletionSettingsPanel
          appSettings={admin.appSettings}
          onSettingChange={admin.handleAppSettingChange}
        />
      )}
    </main>
  );
}

export default AdminPage;