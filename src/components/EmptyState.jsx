import Icon from "./Icon.jsx";

export default function EmptyState({ hasTasks, onClearFilters }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={hasTasks ? "search" : "completed"} size={30} />
      </span>
      <h3>{hasTasks ? "No matching tasks" : "A fresh start, a clear mind."}</h3>
      <p>
        {hasTasks
          ? "Try another search or adjust your filters to find what you need."
          : "Big things start with one small task. Add your first one to get going."}
      </p>
      {hasTasks ? (
        <button className="button secondary" onClick={onClearFilters}>
          Clear search & filters
        </button>
      ) : (
        <button
          className="text-button"
          onClick={() => document.getElementById("new-title").focus()}
        >
          Create your first task <Icon name="arrow" size={17} />
        </button>
      )}
    </div>
  );
}
