import type { Fossil } from "../../types/fossil";
import { normaliseUid } from "../../hooks/useAdminManager";

type RfidSectionProps = {
  selectedFossil: Fossil;
  newRfidUid: string;
  lastScanUid: string;
  onNewRfidUidChange: (uid: string) => void;
  onAddRfidUid: () => void;
  onAddLastScanAsRfid: () => void;
  onRemoveRfidUid: (uid: string) => void;
};

function RfidSection({
  selectedFossil,
  newRfidUid,
  lastScanUid,
  onNewRfidUidChange,
  onAddRfidUid,
  onAddLastScanAsRfid,
  onRemoveRfidUid,
}: RfidSectionProps) {
  return (
    <section className="admin-subsection">
      <div className="admin-subsection-header">
        <div>
          <span>Scanner koppeling</span>
          <h3>RFID UID</h3>
        </div>
      </div>

      <div className="admin-scan-box">
        <div>
          <span>Laatste scan</span>
          <strong>{lastScanUid || "Nog geen RFID gescand"}</strong>
        </div>

        <button
          type="button"
          onClick={onAddLastScanAsRfid}
          disabled={!lastScanUid}
        >
          Gebruik deze scan
        </button>
      </div>

      <div className="admin-inline-form">
        <input
          value={newRfidUid}
          onChange={(event) => onNewRfidUidChange(normaliseUid(event.target.value))}
          placeholder="Bijvoorbeeld 2B378F5DCE"
        />

        <button type="button" onClick={onAddRfidUid}>
          RFID toevoegen
        </button>
      </div>

      <div className="admin-chip-list">
        {selectedFossil.rfidUids.map((uid) => (
          <button
            key={uid}
            type="button"
            className="admin-chip"
            onClick={() => onRemoveRfidUid(uid)}
          >
            {uid} ×
          </button>
        ))}
      </div>
    </section>
  );
}

export default RfidSection;
