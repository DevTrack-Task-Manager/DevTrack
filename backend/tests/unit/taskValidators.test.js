'use strict';

const {
  sanitizeDescription,
  validateCreateTask,
  validateUpdateTask,
  validateTaskParams,
} = require('../../utils/taskValidators');
const { TITLE_MAX, DESCRIPTION_MAX } = require('../../models/Task');

describe('validateCreateTask (FR-04, FR-12)', () => {
  test('UT_08: a missing, blank or whitespace-only title is rejected', () => {
    for (const body of [{}, { title: '' }, { title: '   ' }, { title: null }, undefined, null, [], 'text']) {
      expect(validateCreateTask(body).errors.title).toBe('Title is required');
    }
  });

  test('accepts a title alone and does not invent optional fields', () => {
    const { value, errors } = validateCreateTask({ title: '  Buy   milk ' });
    expect(errors).toEqual({});
    expect(value).toEqual({ title: 'Buy milk' });
  });

  test('accepts every optional field and returns sanitised values', () => {
    const { value, errors } = validateCreateTask({
      title: 'Ship it',
      description: 'line one\r\nline two <b>bold</b>',
      status: 'In Progress',
      priority: 'High',
      dueDate: '2026-12-31',
    });
    expect(errors).toEqual({});
    expect(value.description).toBe('line one\nline two bold');
    expect(value.status).toBe('In Progress');
    expect(value.priority).toBe('High');
    expect(value.dueDate).toEqual(new Date('2026-12-31'));
  });

  test('drops fields that clients must never set (userId, _id, createdAt, unknown)', () => {
    const { value } = validateCreateTask({
      title: 'x',
      userId: 'ffffffffffffffffffffffff',
      _id: 'ffffffffffffffffffffffff',
      createdAt: '2000-01-01',
      isAdmin: true,
    });
    expect(Object.keys(value)).toEqual(['title']);
  });

  test('rejects non-string values, including NoSQL operator objects and arrays', () => {
    const { errors } = validateCreateTask({
      title: { $ne: null },
      description: ['a'],
      status: { $in: ['Pending'] },
      priority: 5,
      dueDate: { $gt: '' },
    });
    expect(Object.keys(errors).sort()).toEqual(['description', 'dueDate', 'priority', 'status', 'title']);
  });

  test('enforces the title and description length caps', () => {
    const { errors } = validateCreateTask({ title: 't'.repeat(TITLE_MAX + 1), description: 'd'.repeat(DESCRIPTION_MAX + 1) });
    expect(errors.title).toBe(`Title must be at most ${TITLE_MAX} characters`);
    expect(errors.description).toBe(`Description must be at most ${DESCRIPTION_MAX} characters`);
    expect(validateCreateTask({ title: 't'.repeat(TITLE_MAX) }).errors).toEqual({});
  });

  test.each(['Archived', 'pending', 'PENDING', 'In-Progress', '', ' Pending', null, 1, true])(
    'IT_29: status %p is rejected',
    (status) => {
      expect(validateCreateTask({ title: 'x', status }).errors.status).toBe('Status must be Pending, In Progress or Completed');
    }
  );

  test.each(['Urgent!!', 'high', 'LOW', 'Critical', '', null, 2, false])('IT_15: priority %p is rejected', (priority) => {
    expect(validateCreateTask({ title: 'x', priority }).errors.priority).toBe('Priority must be Low, Medium or High');
  });

  test.each(['Pending', 'In Progress', 'Completed'])('accepts status %s', (status) => {
    expect(validateCreateTask({ title: 'x', status }).errors).toEqual({});
  });

  test.each(['Low', 'Medium', 'High'])('accepts priority %s', (priority) => {
    expect(validateCreateTask({ title: 'x', priority }).errors).toEqual({});
  });

  test.each(['not-a-date', '2026-13-01', '2026-02-31', '31/12/2026', '2026-1-1', 20261231, true, {}, []])(
    'rejects malformed due date %p',
    (dueDate) => {
      expect(validateCreateTask({ title: 'x', dueDate }).errors.dueDate).toBe('Due date must be a valid date');
    }
  );

  test('null or an empty string clears the due date; an ISO date-time is accepted', () => {
    expect(validateCreateTask({ title: 'x', dueDate: null }).value.dueDate).toBeNull();
    expect(validateCreateTask({ title: 'x', dueDate: '' }).value.dueDate).toBeNull();
    expect(validateCreateTask({ title: 'x', dueDate: '2026-12-31T10:00:00.000Z' }).errors).toEqual({});
  });

  test('reports every problem at once, title first', () => {
    const { errors } = validateCreateTask({ title: '', status: 'Nope', priority: 'Nope', dueDate: 'Nope' });
    expect(Object.keys(errors)).toEqual(['title', 'status', 'priority', 'dueDate']);
  });
});

describe('validateUpdateTask (FR-06, FR-08, FR-09, FR-12)', () => {
  test('an empty or non-object body is rejected', () => {
    for (const body of [{}, undefined, null, [], 'text', 7, { unknown: 1 }, { userId: 'x' }]) {
      expect(validateUpdateTask(body).errors).toEqual({ body: 'Provide at least one field to update' });
    }
  });

  test('only the supplied fields are validated and returned', () => {
    const { value, errors } = validateUpdateTask({ status: 'Completed' });
    expect(errors).toEqual({});
    expect(value).toEqual({ status: 'Completed' });
  });

  test('a supplied but invalid field is an error, even when others are fine', () => {
    const { errors, value } = validateUpdateTask({ title: 'ok', priority: 'Urgent' });
    expect(errors).toEqual({ priority: 'Priority must be Low, Medium or High' });
    expect(value).toEqual({ title: 'ok' });
  });

  test('a blank title is rejected on update too', () => {
    expect(validateUpdateTask({ title: '  ' }).errors.title).toBe('Title is required');
  });

  test('clearing optional fields is allowed', () => {
    const { value, errors } = validateUpdateTask({ dueDate: null, description: null });
    expect(errors).toEqual({});
    expect(value).toEqual({ dueDate: null, description: '' });
  });
});

describe('validateTaskParams (FR-12)', () => {
  test('accepts a 24 character hex ObjectId', () => {
    const id = '65f1a2b3c4d5e6f7a8b9c0d1';
    expect(validateTaskParams({ id })).toEqual({ value: { id }, errors: {} });
  });

  test.each(['123', 'not-an-id', '65f1a2b3c4d5e6f7a8b9c0d', '65f1a2b3c4d5e6f7a8b9c0d1x', '65f1a2b3c4d5e6f7a8b9c0g1', '', undefined, null, 12, { $ne: 1 }, ['65f1a2b3c4d5e6f7a8b9c0d1']])(
    'rejects id %p',
    (id) => {
      expect(validateTaskParams({ id }).errors).toEqual({ id: 'Invalid task id' });
    }
  );

  test('a missing params object is rejected, not thrown on', () => {
    expect(validateTaskParams(undefined).errors).toEqual({ id: 'Invalid task id' });
  });
});

describe('sanitizeDescription', () => {
  test('strips tags and control characters, keeps newlines, normalises line endings', () => {
    expect(sanitizeDescription('a\u0000b\r\nc <script>alert(1)</script>d')).toBe('ab\nc alert(1)d');
  });
});
