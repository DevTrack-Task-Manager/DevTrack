import { useState } from 'react';
import Button from './Button';
import { PriorityBadge, StatusBadge } from './TaskBadges';
import { PRIORITIES, STATUS_ACTIONS } from '../constants/tasks';
import { formatDueDate, isOverdue } from '../utils/taskDates';

/**
 * One task. Delete asks for confirmation inline, so a stray click never removes anything.
 * `onDelete`, `onStatusChange(task, nextStatus)` and `onPriorityChange(task, nextPriority)` should return promises; errors are reported
 * by the parent, and this component only resets its own busy state.
 * The status buttons are the quick workflow (Issue #5) and the priority selector is the quick
 * priority change (Issue #6). Both values are always shown as text in the badges, never by colour alone.
 */
export default function TaskItem({ task, onEdit, onDelete, onStatusChange, onPriorityChange }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [movingTo, setMovingTo] = useState(null); // status being saved, or null
  const [savingPriority, setSavingPriority] = useState(false);
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

  const changePriority = async (event) => {
    const next = event.target.value;
    if (next === task.priority) return;
    setSavingPriority(true);
    try {
      await onPriorityChange(task, next);
    } finally {
      setSavingPriority(false);
    }
  };

  const statusActions = onStatusChange ? STATUS_ACTIONS[task.status] ?? [] : [];

  return (
    <li
      className={[
        'task',
        `task--priority-${task.priority.toLowerCase()}`,
        task.status === 'Completed' ? 'task--done' : '',
        overdue ? 'task--overdue' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="task__main">
        <div className="task__head">
          <h3 className="task__title">{task.title}</h3>
          <div className="task__badges">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
        {task.description && <p className="task__description">{task.description}</p>}
        {(due || overdue) && (
          <div className="task__meta">
            {due && <span className="task__due">Due {due}</span>}
            {overdue && <span className="task__overdue">Overdue</span>}
          </div>
        )}
      </div>

      <div className="task__toolbar">
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
            <div className="task__quick">
              {statusActions.length > 0 && (
                <div className="task__group" role="group" aria-label={`Change status of ${task.title}`}>
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
              {onPriorityChange && (
                <div className="task__priority">
                  <span className="task__priority-caption" aria-hidden="true">
                    Priority
                  </span>
                  <select
                    className="input select select--compact"
                    aria-label={`Priority for ${task.title}`}
                    value={task.priority}
                    disabled={savingPriority}
                    aria-busy={savingPriority ? 'true' : undefined}
                    onChange={changePriority}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="task__manage">
              <Button variant="outline" size="small" aria-label={`Edit ${task.title}`} onClick={() => onEdit(task)}>
                Edit
              </Button>
              <Button variant="outline" size="small" aria-label={`Delete ${task.title}`} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
