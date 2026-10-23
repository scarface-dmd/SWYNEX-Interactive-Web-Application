import Icon from "./Icon.jsx";

export default function AppHeader({ status, onStatusChange, counts }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#main">
        <span className="brand-icon">
          <Icon name="check" size={25} />
        </span>
        TaskFlow<span className="brand-dot">.</span>
      </a>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Task views" className="navigation">
        {[
          ["All", "All tasks", "grid", counts.total],
          ["Active", "Active tasks", "circle", counts.active],
          ["Completed", "Completed", "completed", counts.completed],
        ].map(([value, label, icon, count]) => (
          <button
            key={value}
            className={`nav-button ${status === value ? "selected" : ""}`}
            onClick={() => onStatusChange(value)}
            aria-pressed={status === value}
          >
            <Icon name={icon} />
            <span>{label}</span>
            <span className="nav-count">{count}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="note-icon">
          <Icon name="shield" />
        </span>
        <strong>Your space. Your pace.</strong>
        <p>
          No accounts. No distractions.
          <br />
          Just you and your next step.
        </p>
        <span className="local-label">
          <span /> Stored in this browser
        </span>
      </div>
      <div className="sidebar-footer">
        SWYNEX INTERNSHIP <span>Task 02</span>
      </div>
    </aside>
  );
}
