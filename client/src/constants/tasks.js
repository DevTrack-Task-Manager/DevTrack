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

/** Task list filters (Issue #7, FR-10). An empty string means "no filter" for that field. */
export const NO_FILTERS = Object.freeze({ status: '', priority: '' });

export const hasActiveFilters = (filters) => Boolean(filters.status || filters.priority);

/** Mirrors what the server returns for these filters, so the list stays correct after an edit. */
export const matchesFilters = (task, filters) =>
  (!filters.status || task.status === filters.status) && (!filters.priority || task.priority === filters.priority);

/** Dashboard counters (Issue #7). The server sends `summary` for the whole list; these helpers keep it right after edits. */
export const emptySummary = () => ({
  total: 0,
  byStatus: Object.fromEntries(STATUSES.map((status) => [status, 0])),
  byPriority: Object.fromEntries(PRIORITIES.map((priority) => [priority, 0])),
});

/** Fallback when the server sends no summary: count what is in the list. */
export function summarizeTasks(tasks) {
  return tasks.reduce((summary, task) => adjustSummary(summary, null, task), emptySummary());
}

/** Returns a new summary with `before` taken out and `after` put in (either may be null). */
export function adjustSummary(summary, before, after) {
  const next = { total: summary.total, byStatus: { ...summary.byStatus }, byPriority: { ...summary.byPriority } };
  if (before) {
    next.total -= 1;
    next.byStatus[before.status] -= 1;
    next.byPriority[before.priority] -= 1;
  }
  if (after) {
    next.total += 1;
    next.byStatus[after.status] = (next.byStatus[after.status] ?? 0) + 1;
    next.byPriority[after.priority] = (next.byPriority[after.priority] ?? 0) + 1;
  }
  return next;
}

/** Share of the whole list that is completed, as a whole percentage. */
export const completionPercent = (summary) =>
  summary.total === 0 ? 0 : Math.round((summary.byStatus.Completed / summary.total) * 100);

/** Client-side search over title and description (case-insensitive). */
export function matchesSearch(task, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${task.title} ${task.description ?? ''}`.toLowerCase().includes(needle);
}

export const SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'due', label: 'Due date (soonest)' },
  { value: 'priority', label: 'Priority (high first)' },
  { value: 'status', label: 'Status (open first)' },
  { value: 'title', label: 'Title (A to Z)' },
]);

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };
const STATUS_RANK = { 'In Progress': 0, Pending: 1, Completed: 2 };
const time = (task) => new Date(task.createdAt).getTime();

/** The server already returns newest first, so 'newest' keeps that order. Sorting never mutates the input. */
export function sortTasks(tasks, sort) {
  const list = [...tasks];
  switch (sort) {
    case 'oldest':
      return list.sort((a, b) => time(a) - time(b));
    case 'due':
      return list.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    case 'priority':
      return list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    case 'status':
      return list.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    default:
      return list;
  }
}
