'use strict';

const mongoose = require('mongoose');
const Task = require('../../models/Task');
const { TASK_STATUSES, TASK_PRIORITIES, DESCRIPTION_MAX, TITLE_MAX } = Task;

const owner = new mongoose.Types.ObjectId();
const make = (overrides = {}) => new Task({ userId: owner, title: 'Buy groceries', ...overrides });

describe('Task schema (TDD 3.2, FR-08, FR-09)', () => {
  test('UT_09: default status is Pending and default priority is Medium', () => {
    const task = make();
    expect(task.status).toBe('Pending');
    expect(task.priority).toBe('Medium');
    expect(task.dueDate).toBeNull();
    expect(task.description).toBe('');
  });

  test('exposes exactly the supported enums', () => {
    expect([...TASK_STATUSES]).toEqual(['Pending', 'In Progress', 'Completed']);
    expect([...TASK_PRIORITIES]).toEqual(['Low', 'Medium', 'High']);
  });

  test('a valid task passes validation', () => {
    expect(make({ status: 'In Progress', priority: 'High', dueDate: '2026-09-20' }).validateSync()).toBeUndefined();
  });

  test('requires userId and title', () => {
    const err = new Task({}).validateSync();
    expect(Object.keys(err.errors).sort()).toEqual(['title', 'userId']);
  });

  test("rejects status 'Archived' (IT_29) and priority 'Urgent!!' (IT_15)", () => {
    const err = make({ status: 'Archived', priority: 'Urgent!!' }).validateSync();
    expect(err.errors.status).toBeDefined();
    expect(err.errors.priority).toBeDefined();
  });

  test('caps title and description length', () => {
    const err = make({ title: 't'.repeat(TITLE_MAX + 1), description: 'd'.repeat(DESCRIPTION_MAX + 1) }).validateSync();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.description).toBeDefined();
  });

  test('rejects an unparseable due date', () => {
    expect(make({ dueDate: 'not-a-date' }).validateSync().errors.dueDate).toBeDefined();
  });

  test('declares the indexes needed for per-user listing and filtering', () => {
    const keys = Task.schema.indexes().map(([fields]) => Object.keys(fields).join(','));
    expect(keys).toEqual(expect.arrayContaining(['userId,createdAt', 'userId,status,priority']));
  });

  test('has timestamps and serialises ids as strings', () => {
    expect(Task.schema.options.timestamps).toBe(true);
    const json = make().toJSON();
    expect(typeof json.id).toBe('string');
    expect(typeof json.userId).toBe('string');
    expect(json).not.toHaveProperty('_id');
  });
});
