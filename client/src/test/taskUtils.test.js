import { describe, expect, it } from 'vitest';
import { formatDueDate, isOverdue, toDateInputValue } from '../utils/taskDates';
import { toTaskPayload, validateTaskForm } from '../utils/taskValidators';
import { DESCRIPTION_MAX, TITLE_MAX } from '../constants/tasks';

describe('validateTaskForm', () => {
  it('requires a title', () => {
    expect(validateTaskForm({ title: '   ' }).title).toBe('Title is required');
    expect(validateTaskForm({}).title).toBe('Title is required');
  });

  it('caps the title and description at the server limits', () => {
    expect(validateTaskForm({ title: 'a'.repeat(TITLE_MAX) })).toEqual({});
    expect(validateTaskForm({ title: 'a'.repeat(TITLE_MAX + 1) }).title).toBe('Title must be at most 120 characters');
    expect(validateTaskForm({ title: 't', description: 'a'.repeat(DESCRIPTION_MAX + 1) }).description).toBe(
      'Description must be at most 1000 characters'
    );
  });
});

describe('toTaskPayload', () => {
  it('trims text and sends an empty due date as null', () => {
    expect(
      toTaskPayload({ title: '  Hi ', description: ' x ', status: 'Pending', priority: 'Low', dueDate: '' })
    ).toEqual({ title: 'Hi', description: 'x', status: 'Pending', priority: 'Low', dueDate: null });
  });

  it('passes a due date through as YYYY-MM-DD', () => {
    expect(toTaskPayload({ title: 't', description: '', status: 'Pending', priority: 'Low', dueDate: '2026-12-31' }).dueDate).toBe(
      '2026-12-31'
    );
  });
});

describe('task dates', () => {
  it('formats in UTC so the calendar day never shifts', () => {
    expect(formatDueDate('2026-11-05T00:00:00.000Z')).toMatch(/5/);
    expect(formatDueDate(null)).toBe('');
    expect(formatDueDate('garbage')).toBe('');
  });

  it('extracts the date input value', () => {
    expect(toDateInputValue('2026-11-05T00:00:00.000Z')).toBe('2026-11-05');
    expect(toDateInputValue(null)).toBe('');
  });

  it('flags only open tasks whose due date is before today', () => {
    const now = new Date(2026, 9, 28, 12, 0, 0); // 28 Oct 2026, local
    expect(isOverdue({ dueDate: '2026-10-27T00:00:00.000Z', status: 'Pending' }, now)).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-28T00:00:00.000Z', status: 'Pending' }, now)).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-29T00:00:00.000Z', status: 'In Progress' }, now)).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-01T00:00:00.000Z', status: 'Completed' }, now)).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'Pending' }, now)).toBe(false);
  });
});
