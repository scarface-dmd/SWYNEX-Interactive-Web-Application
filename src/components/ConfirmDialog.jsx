import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";

export function Dialog({ title, children, onClose, destructive = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    dialog.querySelector("[data-dialog-initial-focus]")?.focus();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
      else document.getElementById("task-list-heading")?.focus();
    };
  }, []);

  function keepFocusInside(event) {
    if (event.key !== "Tab") return;
    const controls = ref.current.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    // Keep boundary tabs in the dialog instead of moving to browser chrome.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      className={`dialog ${destructive ? "destructive-dialog" : ""}`}
      aria-labelledby="dialog-title"
      onKeyDown={keepFocusInside}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default function ConfirmDialog({ task, onConfirm, onClose }) {
  return (
    <Dialog title="Delete this task?" onClose={onClose} destructive>
      <div className="delete-message">
        <span className="delete-symbol">
          <Icon name="trash" size={25} />
        </span>
        <p>
          <strong>{task.title}</strong> will be permanently removed. This action
          cannot be undone.
        </p>
      </div>
      <div className="dialog-actions">
        <button
          className="button secondary"
          onClick={onClose}
          data-dialog-initial-focus
        >
          Keep task
        </button>
        <button className="button danger" onClick={onConfirm}>
          Delete task
        </button>
      </div>
    </Dialog>
  );
}
