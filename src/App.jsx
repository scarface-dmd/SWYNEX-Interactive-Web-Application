import { useEffect, useReducer, useRef, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import StatCard from "./components/StatCard.jsx";
import TaskForm from "./components/TaskForm.jsx";
import FilterBar from "./components/FilterBar.jsx";
import TaskList from "./components/TaskList.jsx";
import ConfirmDialog, { Dialog } from "./components/ConfirmDialog.jsx";
import Icon from "./components/Icon.jsx";
import {
  filterTasks,
  getTaskCounts,
  loadTasks,
  localDateKey,
  saveTasks,
  taskReducer,
} from "./lib/taskUtils.js";

const defaultFilters = { search: "", status: "All", priority: "All" };

export default function App() {
  const [initial] = useState(loadTasks);
  const [tasks, dispatch] = useReducer(taskReducer, initial.tasks);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const lastSaved = useRef(initial.tasks);
  const [filters, setFilters] = useState(defaultFilters);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [announcement, setAnnouncement] = useState({ message: "", version: 0 });
  const [today, setToday] = useState(localDateKey);

  useEffect(() => {
    if (tasks === lastSaved.current) return;
    setStorageWarning(saveTasks(tasks));
    lastSaved.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const updateDay = () => setToday(localDateKey());
    const timer = window.setInterval(updateDay, 30000);
    window.addEventListener("focus", updateDay);
    document.addEventListener("visibilitychange", updateDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateDay);
      document.removeEventListener("visibilitychange", updateDay);
    };
  }, []);

  const counts = getTaskCounts(tasks, today);
  const visibleTasks = filterTasks(tasks, filters);
  const progress = counts.total
    ? Math.round((counts.completed / counts.total) * 100)
    : 0;
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${today}T12:00:00`));

  function addTask(values) {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: "add", task: { ...values, id, completed: false } });
    announce(`Added: ${values.title}.`);
  }

  function announce(message) {
    setAnnouncement((current) => ({ message, version: current.version + 1 }));
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="app-shell">
        <AppHeader
          status={filters.status}
          onStatusChange={(status) =>
            setFilters((current) => ({ ...current, status }))
          }
          counts={counts}
        />
        <div className="main-shell">
          <header className="topbar">
            <div>
              <span className="breadcrumb">Workspace</span>
              <span className="breadcrumb-slash">/</span>
              <span>My tasks</span>
            </div>
            <span className="personal-badge">
              <span /> Personal workspace
            </span>
          </header>
          <main id="main" tabIndex={-1}>
            <section className="page-heading">
              <div>
                <p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
                <h1>A little focus. A lot of progress.</h1>
                <p className="page-subtitle">
                  Organize your day, one task at a time.
                </p>
              </div>
              <div className="today-label">
                <Icon name="calendar" size={17} />
                {dateLabel}
              </div>
            </section>
            {storageWarning && (
              <div className="storage-warning" role="alert">
                <strong>Browser storage notice</strong>
                <p>{storageWarning}</p>
                <button
                  className="text-button"
                  onClick={() => {
                    const warning = saveTasks(tasks);
                    setStorageWarning(warning);
                    if (!warning)
                      document.getElementById("task-list-heading").focus();
                  }}
                >
                  Try saving again
                </button>
              </div>
            )}
            <section className="stats-grid" aria-label="Task statistics">
              <StatCard
                label="Total tasks"
                value={counts.total}
                icon="grid"
                tone="indigo"
              />
              <StatCard
                label="Active"
                value={counts.active}
                icon="circle"
                tone="blue"
              />
              <StatCard
                label="Completed"
                value={counts.completed}
                icon="completed"
                tone="green"
              />
              <StatCard
                label="Overdue"
                value={counts.overdue}
                icon="clock"
                tone="orange"
              />
            </section>
            <div className="dashboard-grid">
              <section
                className="tasks-panel"
                aria-labelledby="task-list-heading"
              >
                <div className="section-heading">
                  <div>
                    <h2 id="task-list-heading" tabIndex={-1}>
                      Your tasks{" "}
                      <span className="number-badge">{counts.total}</span>
                    </h2>
                    <p>A clear plan for the things ahead.</p>
                  </div>
                  <span className="list-caption">
                    {visibleTasks.length} shown
                  </span>
                </div>
                <FilterBar filters={filters} setFilters={setFilters} />
                <TaskList
                  tasks={visibleTasks}
                  hasTasks={tasks.length > 0}
                  today={today}
                  onToggle={(id) => {
                    const task = tasks.find((task) => task.id === id);
                    if (filters.status !== "All")
                      document.getElementById("task-list-heading").focus();
                    dispatch({ type: "toggle", id });
                    announce(
                      `${task.title}: marked ${task.completed ? "incomplete" : "complete"}.`,
                    );
                  }}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onClearFilters={() => {
                    setFilters(defaultFilters);
                    document.getElementById("search").focus();
                  }}
                />
                <div className="task-list-footer">
                  <Icon name="shield" size={14} />
                  <span>Your tasks stay private, right in this browser.</span>
                </div>
              </section>
              <aside
                className="right-column"
                aria-label="Create and track tasks"
              >
                <section className="form-panel">
                  <div className="form-heading">
                    <span className="form-heading-icon">
                      <Icon name="plus" />
                    </span>
                    <div>
                      <h2>Add a new task</h2>
                      <p>Turn a thought into a next step.</p>
                    </div>
                  </div>
                  <TaskForm onSave={addTask} />
                </section>
                <section
                  className="progress-panel"
                  aria-label="Completion progress"
                >
                  <div>
                    <h2>Small steps add up.</h2>
                    <span>{progress}%</span>
                  </div>
                  <p>
                    {counts.total
                      ? `${counts.completed} of ${counts.total} tasks complete. Keep your momentum.`
                      : "Your next chapter starts with your first task."}
                  </p>
                  <progress
                    max="100"
                    value={progress}
                    aria-label="Tasks completed"
                  >
                    {progress}%
                  </progress>
                </section>
              </aside>
            </div>
            <footer className="page-footer">
              <span>A little more organized. A little less overwhelmed.</span>
              <span>Built for focus.</span>
            </footer>
          </main>
        </div>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        <span key={announcement.version}>{announcement.message}</span>
      </div>
      {editing && (
        <Dialog title="Edit task" onClose={() => setEditing(null)}>
          <TaskForm
            task={editing}
            onCancel={() => setEditing(null)}
            onSave={(values) => {
              dispatch({ type: "edit", id: editing.id, values });
              setEditing(null);
              announce(`Saved changes: ${values.title}.`);
            }}
          />
        </Dialog>
      )}
      {deleting && (
        <ConfirmDialog
          task={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            dispatch({ type: "delete", id: deleting.id });
            setDeleting(null);
            announce(`Deleted: ${deleting.title}.`);
          }}
        />
      )}
    </>
  );
}
