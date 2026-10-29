import { DESCRIPTION_MAX, TITLE_MAX } from '../constants/tasks';

/**
 * Client-side validation for the task form. Messages match the server
 * (backend/utils/taskValidators.js) so the same text appears whichever side catches a problem.
 * The server stays the source of truth; this gives instant inline feedback (FR-12).
 */
export function validateTaskForm({ title = '', description = '' }) {
  const errors = {};
  const cleanTitle = title.trim();

  if (!cleanTitle) errors.title = 'Title is required';
  else if (cleanTitle.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`;

  if (description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
  }
  return errors;
}

/** Form values -> API payload. An empty due date is sent as null, which clears it. */
export function toTaskPayload({ title, description, status, priority, dueDate }) {
  return {
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    dueDate: dueDate || null,
  };
}
