import { describe, expect, it } from 'vitest';
import {
  SORT_OPTIONS,
  adjustSummary,
  completionPercent,
  emptySummary,
  matchesSearch,
  sortTasks,
  summarizeTasks,
} from '../constants/tasks';
import { initialsOf } from '../utils/initials';

const t = (overrides) => ({
  id: 'x',
  title: 'Task',
  description: '',
  status: 'Pending',
  priority: 'Medium',
  dueDate: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('summary helpers', () => {
  it('emptySummary has a zero for every status and priority', () => {
    expect(emptySummary()).toEqual({
      total: 0,
      byStatus: { Pending: 0, 'In Progress': 0, Completed: 0 },
      byPriority: { Low: 0, Medium: 0, High: 0 },
    });
  });

  it('summarizeTasks counts a list', () => {
    const summary = summarizeTasks([t({ status: 'Pending', priority: 'High' }), t({ status: 'Completed', priority: 'High' }), t({ status: 'Completed', priority: 'Low' })]);
    expect(summary.total).toBe(3);
    expect(summary.byStatus).toEqual({ Pending: 1, 'In Progress': 0, Completed: 2 });
    expect(summary.byPriority).toEqual({ Low: 1, Medium: 0, High: 2 });
  });

  it('adjustSummary moves a task between buckets without mutating the original', () => {
    const before = t({ status: 'Pending', priority: 'Low' });
    const start = summarizeTasks([before]);
    const next = adjustSummary(start, before, { ...before, status: 'Completed', priority: 'High' });
    expect(next.total).toBe(1);
    expect(next.byStatus).toEqual({ Pending: 0, 'In Progress': 0, Completed: 1 });
    expect(next.byPriority).toEqual({ Low: 0, Medium: 0, High: 1 });
    expect(start.byStatus.Pending).toBe(1);
  });

  it('adjustSummary handles add-only and remove-only', () => {
    const task = t();
    expect(adjustSummary(emptySummary(), null, task).total).toBe(1);
    expect(adjustSummary(summarizeTasks([task]), task, null).total).toBe(0);
  });

  it('completionPercent rounds and never divides by zero', () => {
    expect(completionPercent(emptySummary())).toBe(0);
    expect(completionPercent(summarizeTasks([t({ status: 'Completed' }), t(), t()]))).toBe(33);
    expect(completionPercent(summarizeTasks([t({ status: 'Completed' })]))).toBe(100);
  });
});

describe('matchesSearch', () => {
  const task = t({ title: 'Write Report', description: 'Quarterly numbers' });
  it('matches title and description, ignoring case and outer spaces', () => {
    expect(matchesSearch(task, 'report')).toBe(true);
    expect(matchesSearch(task, '  QUARTERLY ')).toBe(true);
    expect(matchesSearch(task, 'budget')).toBe(false);
  });
  it('an empty query matches everything; a missing description is fine', () => {
    expect(matchesSearch(task, '')).toBe(true);
    expect(matchesSearch(task, '   ')).toBe(true);
    expect(matchesSearch(t({ description: undefined }), 'task')).toBe(true);
  });
});

describe('sortTasks', () => {
  const list = [
    t({ id: 'a', title: 'banana', priority: 'Low', status: 'Completed', createdAt: '2026-10-03T00:00:00.000Z', dueDate: '2026-12-01T00:00:00.000Z' }),
    t({ id: 'b', title: 'Apple', priority: 'High', status: 'Pending', createdAt: '2026-10-02T00:00:00.000Z', dueDate: null }),
    t({ id: 'c', title: 'cherry', priority: 'Medium', status: 'In Progress', createdAt: '2026-10-01T00:00:00.000Z', dueDate: '2026-11-01T00:00:00.000Z' }),
  ];
  const ids = (sort) => sortTasks(list, sort).map((x) => x.id);

  it('has a label for each option', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['newest', 'oldest', 'due', 'priority', 'status', 'title']);
  });
  it('newest keeps the server order', () => expect(ids('newest')).toEqual(['a', 'b', 'c']));
  it('oldest orders by creation date', () => expect(ids('oldest')).toEqual(['c', 'b', 'a']));
  it('due puts the soonest first and undated tasks last', () => expect(ids('due')).toEqual(['c', 'a', 'b']));
  it('priority puts High first', () => expect(ids('priority')).toEqual(['b', 'c', 'a']));
  it('status puts open work first and Completed last', () => expect(ids('status')).toEqual(['c', 'b', 'a']));
  it('title is alphabetical, ignoring case', () => expect(ids('title')).toEqual(['b', 'a', 'c']));
  it('does not mutate the input and ignores an unknown sort', () => {
    const copy = [...list];
    sortTasks(list, 'title');
    expect(list).toEqual(copy);
    expect(ids('nonsense')).toEqual(['a', 'b', 'c']);
  });
});

describe('initialsOf', () => {
  it('uses the first and last word', () => {
    expect(initialsOf('Priya Sharma')).toBe('PS');
    expect(initialsOf('anirudh')).toBe('A');
    expect(initialsOf('  mary   jane  watson ')).toBe('MW');
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(undefined)).toBe('?');
  });
});
