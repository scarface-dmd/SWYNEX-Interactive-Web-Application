import { formatDueDate, isOverdue } from "../lib/taskUtils.js";
import Icon from "./Icon.jsx";

export default function TaskCard({ task, today, onToggle, onEdit, onDelete }) {
  const overdue = isOverdue(task, today);
  return (
    <article className={`task-card ${task.completed ? "is-completed" : ""}`}>
      <label className="task-checkbox">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
        />
        <span>
          <Icon name="check" size={15} />
        </span>
      </label>
      <div className="task-content">
        <h3>{task.title}</h3>
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
        <div className="task-meta">
          <span className={`priority-badge ${task.priority.toLowerCase()}`}>
            <span />
            {task.priority} priority
          </span>
          {task.dueDate && (
            <span className={`due-date ${overdue ? "overdue" : ""}`}>
              <Icon name="calendar" size={14} />
              <time dateTime={task.dueDate}>{formatDueDate(task.dueDate)}</time>
              {overdue && <span className="overdue-label">Overdue</span>}
            </span>
          )}
          {task.completed && (
            <span className="completed-label">
              <Icon name="check" size={14} />
              Completed
            </span>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button
          className="icon-button"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
          title="Edit task"
        >
          <Icon name="edit" size={17} />
        </button>
        <button
          className="icon-button delete-button"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
          title="Delete task"
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
    </article>
  );
}
