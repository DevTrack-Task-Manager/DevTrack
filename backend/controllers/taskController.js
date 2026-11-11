'use strict';

const Task = require('../models/Task');
const { TASK_STATUSES, TASK_PRIORITIES } = Task;
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const TASK_NOT_FOUND = 'Task not found';

/**
 * Builds the query filter for a single task. EVERY single-task query goes through here, so the
 * owner is always part of the filter (FR-11). The id has already been format-checked by
 * validate.params(validateTaskParams) (400 when malformed). A task that does not exist or that
 * belongs to someone else produces the same 404, so ids cannot be probed.
 */
function ownedFilter(req) {
  return { _id: req.validatedParams.id, userId: req.user.id };
}

/**
 * Counts for the dashboard cards: the user's WHOLE list, never narrowed by the filters, so the
 * numbers stay put while the list below is filtered. Scoped by owner like every other query.
 */
async function summarize(ownerId) {
  const [facets] = await Task.aggregate([
    { $match: { userId: ownerId } },
    {
      $facet: {
        status: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        priority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
      },
    },
  ]);
  const tally = (values, rows) =>
    Object.fromEntries(values.map((value) => [value, rows.find((row) => row._id === value)?.count ?? 0]));
  const byStatus = tally(TASK_STATUSES, facets.status);
  return {
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus,
    byPriority: tally(TASK_PRIORITIES, facets.priority),
  };
}

/**
 * GET /api/tasks (FR-05, FR-10): the signed-in user's tasks, newest first, optionally narrowed by
 * ?status= and/or ?priority= (both together = AND). The owner is ALWAYS part of the query and is
 * spread last, so no filter value can ever override it (FR-11). Filter values come from
 * validate.query(validateTaskQuery), so they are enum strings, never objects.
 */
const listTasks = asyncHandler(async (req, res) => {
  const filter = { ...req.validatedQuery, userId: req.user.id };
  const [tasks, summary] = await Promise.all([
    Task.find(filter).sort({ createdAt: -1, _id: -1 }),
    summarize(req.user._id),
  ]);
  res.json({ tasks, count: tasks.length, summary });
});

/** POST /api/tasks (FR-04): the owner always comes from the verified token, never the body. */
const createTask = asyncHandler(async (req, res) => {
  const task = await Task.create({ ...req.validated, userId: req.user.id });
  res.status(201).json({ message: 'Task created', task });
});

/** PUT /api/tasks/:id (FR-06, FR-08, FR-09) */
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndUpdate(
    ownedFilter(req),
    { $set: req.validated },
    { new: true, runValidators: true }
  );
  if (!task) throw AppError.notFound(TASK_NOT_FOUND);
  res.json({ message: 'Task updated', task });
});

/** DELETE /api/tasks/:id (FR-07) */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOneAndDelete(ownedFilter(req));
  if (!task) throw AppError.notFound(TASK_NOT_FOUND);
  res.json({ message: 'Task deleted', id: task.id });
});

module.exports = { listTasks, createTask, updateTask, deleteTask };
