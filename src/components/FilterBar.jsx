import Icon from "./Icon.jsx";
import { PRIORITIES } from "../lib/taskUtils.js";

export default function FilterBar({ filters, setFilters }) {
  const change = (name, value) =>
    setFilters((current) => ({ ...current, [name]: value }));
  return (
    <div className="filter-bar">
      <div className="search-field">
        <Icon name="search" size={19} />
        <label className="sr-only" htmlFor="search">
          Search tasks
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search your tasks..."
          value={filters.search}
          onChange={(event) => change("search", event.target.value)}
        />
      </div>
      <div className="filter-controls">
        <div className="status-tabs" role="group" aria-label="Filter by status">
          {["All", "Active", "Completed"].map((status) => (
            <button
              key={status}
              aria-pressed={filters.status === status}
              className={filters.status === status ? "selected" : ""}
              onClick={() => change("status", status)}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="priority-filter">
          Filter by priority
        </label>
        <select
          id="priority-filter"
          value={filters.priority}
          onChange={(event) => change("priority", event.target.value)}
        >
          <option value="All">All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority} priority
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
