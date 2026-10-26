import fossilWheel from "../assets/fossiel-wheel.png";
import "./IdleResetScreen.css";

type IdleResetScreenProps = {
  wasResetByInactivity?: boolean;
};

function IdleResetScreen({ wasResetByInactivity = false }: IdleResetScreenProps) {
  return (
    <section className="idle-screen">
      <div className="idle-copy">
        <div className="idle-brand">
          <strong>Kina</strong>
          <span>Museum voor kind en natuur</span>
        </div>

        <h1>Het Fossielenspoor</h1>

        <div className="idle-info">
          <p className="idle-kicker">
            {wasResetByInactivity ? "Nieuwe ronde." : "Draai. Scan. Ontdek."}
          </p>

          <p className="idle-description">
            Draai aan de carrousel en breng een fossiel naar de scanzone.
            Het scherm herkent jouw vondst en toont het verhaal erachter.
          </p>
        </div>
      </div>

      <img
        className="idle-wheel"
        src={fossilWheel}
        alt=""
        aria-hidden="true"
      />
    </section>
  );
}

export default IdleResetScreen;
