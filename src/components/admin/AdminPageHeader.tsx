type AdminPageHeaderProps = {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenScanPage: () => void;
  onPreviewDiplomaScreen: () => void;
  onPreviewNoDiplomaScreen: () => void;
  onResetFlow: () => void;
  onSave: () => void;
};

function AdminPageHeader({
  isSaving,
  hasUnsavedChanges,
  audioEnabled,
  onToggleAudio,
  onOpenScanPage,
  onPreviewDiplomaScreen,
  onPreviewNoDiplomaScreen,
  onResetFlow,
  onSave,
}: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-header-title">
        <h1>Fossielenspoor Adminpanel</h1>
      </div>

      <div className="admin-header-actions">
        <div className="admin-header-row">
          <button
            type="button"
            className={`admin-header-button admin-header-button--audio ${
              audioEnabled ? "is-on" : "is-off"
            }`}
            onClick={onToggleAudio}
          >
            {audioEnabled ? "Audio aan" : "Audio uit"}
          </button>

          <button
            type="button"
            className="admin-header-button"
            onClick={onPreviewDiplomaScreen}
          >
            Test diploma
          </button>

          <button
            type="button"
            className="admin-header-button"
            onClick={onPreviewNoDiplomaScreen}
          >
            Test zonder diploma
          </button>
        </div>

        <div className="admin-header-row admin-header-row--right">
          <button
            type="button"
            className="admin-header-button"
            onClick={onOpenScanPage}
          >
            Scanpagina
          </button>

          <button
            type="button"
            className="admin-header-button"
            onClick={onResetFlow}
          >
            Reset flow
          </button>

          <button
            type="button"
            className="admin-header-save"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminPageHeader;
