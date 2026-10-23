import Icon from "./Icon.jsx";

export default function StatCard({ label, value, icon, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
