import { useRef, useState } from "react";
import { PRIORITIES, validateTask } from "../lib/taskUtils.js";
import Icon from "./Icon.jsx";

const blankTask = {
  title: "",
  description: "",
  priority: "Medium",
  dueDate: "",
};

export default function TaskForm({ task, onSave, onCancel }) {
  const [values, setValues] = useState(
    task
      ? {
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
        }
      : blankTask,
  );
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);
  const prefix = task ? "edit" : "new";

  function change(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validateTask(values);
    // Native date inputs expose partial entries as an empty value plus badInput.
    if (formRef.current.elements.namedItem("dueDate").validity.badInput) {
      nextErrors.dueDate =
        "Enter a complete calendar date, or clear the date field.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      formRef.current.elements.namedItem(Object.keys(nextErrors)[0]).focus();
      return;
    }
    onSave({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    });
    if (!task) {
      setValues(blankTask);
      formRef.current.elements.namedItem("title").focus();
    }
  }

  function fieldProps(name) {
    return {
      id: `${prefix}-${name}`,
      name,
      value: values[name],
      onChange: change,
      "aria-invalid": Boolean(errors[name]),
      "aria-describedby": errors[name] ? `${prefix}-${name}-error` : undefined,
    };
  }

  const error = (name) =>
    errors[name] && (
      <p className="field-error" id={`${prefix}-${name}-error`} role="alert">
        {errors[name]}
      </p>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="task-form">
      <div className="field">
        <label htmlFor={`${prefix}-title`}>
          Task title <span className="required">*</span>
        </label>
        <input
          {...fieldProps("title")}
          placeholder="What needs to get done?"
          required
          aria-required="true"
          data-dialog-initial-focus={task ? "" : undefined}
        />
        {error("title")}
        <div
          className={`character-count ${values.title.length > 100 ? "over-limit" : ""}`}
        >
          {values.title.length}/100
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-description`}>
          Description <span className="optional">(optional)</span>
        </label>
        <textarea
          {...fieldProps("description")}
          placeholder="Add a little more detail..."
          rows={4}
        />
        {error("description")}
        <div
          className={`character-count ${values.description.length > 500 ? "over-limit" : ""}`}
        >
          {values.description.length}/500
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-priority`}>Priority</label>
        <select {...fieldProps("priority")}>
          {PRIORITIES.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
        {error("priority")}
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-dueDate`}>
          Due date <span className="optional">(optional)</span>
        </label>
        <input type="date" {...fieldProps("dueDate")} />
        {error("dueDate")}
        <p className="field-hint">A little deadline can go a long way.</p>
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="button primary">
          {task ? (
            <Icon name="check" size={18} />
          ) : (
            <Icon name="plus" size={18} />
          )}
          {task ? "Save changes" : "Add task"}
        </button>
      </div>
    </form>
  );
}
