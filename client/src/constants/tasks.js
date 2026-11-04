/**
 * Task enums and limits. They mirror backend/models/Task.js (TDD 3.2), so the values below are
 * exactly what the API accepts and returns. Change them in both places together.
 */
export const STATUSES = Object.freeze(['Pending', 'In Progress', 'Completed']);
export const PRIORITIES = Object.freeze(['Low', 'Medium', 'High']);

export const DEFAULT_STATUS = 'Pending';
export const DEFAULT_PRIORITY = 'Medium';

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 1000;

/**
 * Status workflow (Issue #5, FR-08): the one-click moves offered on each task card.
 * Any status can still be set from the edit form, so the workflow is a shortcut, not a rule;
 * the server accepts any of the three values at any time (see DEVIATIONS.md).
 */
export const STATUS_ACTIONS = Object.freeze({
  Pending: Object.freeze([
    { label: 'Start', next: 'In Progress' },
    { label: 'Complete', next: 'Completed' },
  ]),
  'In Progress': Object.freeze([
    { label: 'Complete', next: 'Completed' },
    { label: 'Back to Pending', next: 'Pending' },
  ]),
  Completed: Object.freeze([{ label: 'Reopen', next: 'In Progress' }]),
});
