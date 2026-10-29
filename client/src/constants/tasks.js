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
