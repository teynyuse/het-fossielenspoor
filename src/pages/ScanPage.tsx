import IdleResetScreen from "../components/IdleResetScreen";
import ScanHeader from "../components/ScanHeader";
import StatePanel from "../components/StatePanel";
import FossilDisplay from "../components/FossilDisplay";
import CompletionScreen from "../components/CompletionScreen";
import { useScanFlow } from "../hooks/useScanFlow";
import "./ScanPage.css";

function ScanPage() {
  const {
    currentFossil,
    appSettings,
    errorMessage,
    hasScan,
    isComplete,
    handleFinalAudioEnded,
    handleFinalAudioFailed,
  } = useScanFlow();

  const previewMode = new URLSearchParams(window.location.search).get(
    "completePreview",
  );

  const isCompletionPreview =
    previewMode === "diploma" || previewMode === "no-diploma";

  const previewAppSettings = {
    ...appSettings,
    diplomaEnabled: previewMode === "diploma",
  };

  const showIdleScreen = !errorMessage && !hasScan && !isComplete;

  if (isCompletionPreview) {
    return (
      <main className="scan-page">
        <section className="scan-shell">
          <CompletionScreen appSettings={previewAppSettings} />
        </section>
      </main>
    );
  }

  return (
    <main className="scan-page">
      <section className="scan-shell">
        {!showIdleScreen && <ScanHeader />}

        {errorMessage && (
          <StatePanel
            label="FOUT"
            title="Er ging iets mis"
            description={errorMessage}
          />
        )}

        {showIdleScreen && <IdleResetScreen />}

        {!errorMessage && isComplete && (
          <CompletionScreen appSettings={appSettings} />
        )}

        {!errorMessage && hasScan && !isComplete && !currentFossil && (
          <StatePanel
            label="ONBEKENDE VONDST"
            title="Dit fossiel is nog niet ingesteld"
            description="Deze tag is nog niet gekoppeld aan een fossiel in het adminpanel."
          />
        )}

        {!errorMessage && hasScan && !isComplete && currentFossil && (
          <FossilDisplay
            key={currentFossil.id}
            fossil={currentFossil}
            audioEnabled={appSettings.audioEnabled}
            onAudioEnded={handleFinalAudioEnded}
            onAudioFailed={handleFinalAudioFailed}
          />
        )}
      </section>
    </main>
  );
}

export default ScanPage;
