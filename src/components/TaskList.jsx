import TaskCard from "./TaskCard.jsx";
import EmptyState from "./EmptyState.jsx";

export default function TaskList({
  tasks,
  hasTasks,
  today,
  onToggle,
  onEdit,
  onDelete,
  onClearFilters,
}) {
  if (!tasks.length)
    return <EmptyState hasTasks={hasTasks} onClearFilters={onClearFilters} />;
  return (
    <ul className="task-list" aria-label="Tasks">
      {tasks.map((task) => (
        <li key={task.id}>
          <TaskCard
            task={task}
            today={today}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}
