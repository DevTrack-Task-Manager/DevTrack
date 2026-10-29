/**
 * Due dates are calendar dates, stored by the API as midnight UTC. They are formatted in UTC so
 * a due date of 5 Nov never slides to 4 Nov in a timezone behind UTC.
 */
const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });

/** '2026-11-05T00:00:00.000Z' -> '5 Nov 2026' (locale dependent); null -> '' */
export function formatDueDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}

/** ISO string -> 'YYYY-MM-DD' for <input type="date">. */
export function toDateInputValue(iso) {
  return typeof iso === 'string' ? iso.slice(0, 10) : '';
}

function localDateString(now) {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** A task is overdue when its due date is before today (the user's local date) and it is not completed. */
export function isOverdue(task, now = new Date()) {
  if (!task.dueDate || task.status === 'Completed') return false;
  return toDateInputValue(task.dueDate) < localDateString(now);
}
