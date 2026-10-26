import type { Fossil } from "../../types/fossil";
import type { FossilTextField } from "../../hooks/useAdminManager";

type FossilBasicFormProps = {
  selectedFossil: Fossil;
  onTextChange: (field: FossilTextField, value: string) => void;
  onLedChange: (value: string) => void;
};

function FossilBasicForm({
  selectedFossil,
  onTextChange,
  onLedChange,
}: FossilBasicFormProps) {
  return (
    <>
      <div className="admin-editor-title">
        <span>Geselecteerd fossiel</span>
        <h2>{selectedFossil.name}</h2>
      </div>

      <div className="admin-form-grid">
        <label>
          Naam
          <input
            value={selectedFossil.name}
            onChange={(event) => onTextChange("name", event.target.value)}
          />
        </label>

        <label>
          Periode
          <input
            value={selectedFossil.period}
            onChange={(event) => onTextChange("period", event.target.value)}
          />
        </label>

        <label>
          Leeftijd
          <input
            value={selectedFossil.age}
            onChange={(event) => onTextChange("age", event.target.value)}
          />
        </label>

        <label>
          LED nummer
          <select
            value={selectedFossil.ledNumber ?? 1}
            onChange={(event) => onLedChange(event.target.value)}
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <option key={index + 1} value={index + 1}>
                LED {index + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="admin-full-field">
        Korte beschrijving
        <textarea
          value={selectedFossil.shortDescription}
          onChange={(event) => onTextChange("shortDescription", event.target.value)}
          rows={4}
        />
      </label>
    </>
  );
}

export default FossilBasicForm;
