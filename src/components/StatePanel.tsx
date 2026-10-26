import "./StatePanel.css";

type StatePanelProps = {
  label: string;
  title: string;
  description: string;
};

function StatePanel({ label, title, description }: StatePanelProps) {
  return (
    <section className="state-panel">
      <p className="state-label">{label}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default StatePanel;
