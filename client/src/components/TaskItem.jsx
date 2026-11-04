import { useState } from 'react';
import Button from './Button';
import { PriorityBadge, StatusBadge } from './TaskBadges';
import { STATUS_ACTIONS } from '../constants/tasks';
import { formatDueDate, isOverdue } from '../utils/taskDates';

/**
 * One task. Delete asks for confirmation inline, so a stray click never removes anything.
 * `onDelete` and `onStatusChange(task, nextStatus)` should return promises; errors are reported
 * by the parent, and this component only resets its own busy state.
 * The status buttons are the quick workflow (Issue #5); the current status is always shown as
 * text in the badge, never by colour alone.
 */
export default function TaskItem({ task, onEdit, onDelete, onStatusChange }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [movingTo, setMovingTo] = useState(null); // status being saved, or null
  const overdue = isOverdue(task);
  const due = formatDueDate(task.dueDate);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(task);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const changeStatus = async (next) => {
    setMovingTo(next);
    try {
      await onStatusChange(task, next);
    } finally {
      setMovingTo(null);
    }
  };

  const statusActions = onStatusChange ? STATUS_ACTIONS[task.status] ?? [] : [];

  return (
    <li className={`task task--priority-${task.priority.toLowerCase()} ${task.status === 'Completed' ? 'task--done' : ''}`}>
      <div className="task__body">
        <h3 className="task__title">{task.title}</h3>
        {task.description && <p className="task__description">{task.description}</p>}
        <div className="task__meta">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {due && <span className="task__due">Due {due}</span>}
          {overdue && <span className="task__overdue">Overdue</span>}
        </div>
      </div>

      <div className="task__actions">
        {confirming ? (
          <div className="task__confirm" role="group" aria-label={`Confirm deleting ${task.title}`}>
            <span className="task__confirm-text">Delete this task?</span>
            <Button variant="danger" size="small" loading={deleting} onClick={confirmDelete}>
              Yes, delete
            </Button>
            <Button variant="outline" size="small" disabled={deleting} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <>
            {statusActions.length > 0 && (
              <div className="task__confirm" role="group" aria-label={`Change status of ${task.title}`}>
                {statusActions.map(({ label, next }) => (
                  <Button
                    key={next}
                    variant="outline"
                    size="small"
                    aria-label={`Mark ${task.title} as ${next}`}
                    loading={movingTo === next}
                    disabled={movingTo !== null}
                    onClick={() => changeStatus(next)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
            <Button variant="outline" size="small" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}>
              Edit
            </Button>
            <Button variant="outline" size="small" aria-label={`Delete ${task.title}`} onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
