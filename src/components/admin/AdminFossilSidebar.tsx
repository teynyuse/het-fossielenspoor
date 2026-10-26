import type { Fossil } from "../../types/fossil";

type AdminFossilSidebarProps = {
  fossils: Fossil[];
  selectedFossilId: string;
  onSelectFossil: (fossilId: string) => void;
};

function AdminFossilSidebar({
  fossils,
  selectedFossilId,
  onSelectFossil,
}: AdminFossilSidebarProps) {
  return (
    <aside className="admin-fossil-list">
      <h2>Fossielen</h2>

      <div className="admin-fossil-buttons">
        {fossils.map((fossil) => (
          <button
            key={fossil.id}
            type="button"
            className={
              fossil.id === selectedFossilId
                ? "admin-fossil-button admin-fossil-button--active"
                : "admin-fossil-button"
            }
            onClick={() => onSelectFossil(fossil.id)}
          >
            <strong>{fossil.name}</strong>
            <span>LED {fossil.ledNumber}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default AdminFossilSidebar;
