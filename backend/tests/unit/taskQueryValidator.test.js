'use strict';

const { validateTaskQuery } = require('../../utils/taskValidators');

describe('validateTaskQuery (FR-10, FR-12)', () => {
  test('UT_15: no query means no filters', () => {
    for (const query of [undefined, null, {}, { page: '2' }]) {
      expect(validateTaskQuery(query)).toEqual({ value: {}, errors: {} });
    }
  });

  test('accepts each status and priority', () => {
    for (const status of ['Pending', 'In Progress', 'Completed']) {
      expect(validateTaskQuery({ status }).value).toEqual({ status });
    }
    for (const priority of ['Low', 'Medium', 'High']) {
      expect(validateTaskQuery({ priority }).value).toEqual({ priority });
    }
  });

  test('accepts both filters together', () => {
    expect(validateTaskQuery({ status: 'Pending', priority: 'High' })).toEqual({
      value: { status: 'Pending', priority: 'High' },
      errors: {},
    });
  });

  test('an empty value is "no filter" (what a cleared dropdown sends)', () => {
    expect(validateTaskQuery({ status: '', priority: '' })).toEqual({ value: {}, errors: {} });
    expect(validateTaskQuery({ status: '', priority: 'Low' }).value).toEqual({ priority: 'Low' });
  });

  test.each(['Archived', 'pending', 'PENDING', 'In%20Progress', ' Pending', 'Pending ', 'null', 'undefined'])(
    'rejects unsupported status %p',
    (status) => {
      expect(validateTaskQuery({ status }).errors.status).toBe('Status must be Pending, In Progress or Completed');
    }
  );

  test.each(['Urgent', 'high', 'LOW', 'Critical', '1'])('rejects unsupported priority %p', (priority) => {
    expect(validateTaskQuery({ priority }).errors.priority).toBe('Priority must be Low, Medium or High');
  });

  test('rejects repeated and nested parameters (arrays and operator objects)', () => {
    expect(validateTaskQuery({ status: ['Pending', 'Completed'] }).errors).toHaveProperty('status');
    expect(validateTaskQuery({ status: { $ne: 'Pending' } }).errors).toHaveProperty('status');
    expect(validateTaskQuery({ priority: { $gt: '' } }).errors).toHaveProperty('priority');
  });

  test('only whitelisted keys are returned; userId and others are dropped', () => {
    const { value, errors } = validateTaskQuery({ status: 'Pending', userId: 'ffffffffffffffffffffffff', title: 'x', $where: '1' });
    expect(errors).toEqual({});
    expect(value).toEqual({ status: 'Pending' });
  });

  test('reports both bad filters together', () => {
    expect(Object.keys(validateTaskQuery({ status: 'x', priority: 'y' }).errors)).toEqual(['status', 'priority']);
  });
});
