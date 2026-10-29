import { useState } from 'react';
import Button from './Button';
import { PriorityBadge, StatusBadge } from './TaskBadges';
import { formatDueDate, isOverdue } from '../utils/taskDates';

/**
 * One task. Delete asks for confirmation inline, so a stray click never removes anything.
 * `onDelete` should return a promise; errors are reported by the parent, and this component
 * only resets its own busy state.
 */
export default function TaskItem({ task, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
