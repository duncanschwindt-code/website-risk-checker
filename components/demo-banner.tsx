export function DemoBanner(): React.ReactElement {
  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-100 px-5 py-3 text-center text-sm font-bold text-amber-950"
    >
      Demonstration mode uses simulated data. No live threat-intelligence
      services were checked.
    </div>
  );
}
