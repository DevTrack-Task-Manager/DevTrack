'use strict';

const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const TASK_NOT_FOUND = 'Task not found';
const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Builds the query filter for a single task. EVERY single-task query goes through here, so the
 * owner is always part of the filter (FR-11). A task that does not exist, belongs to someone
 * else, or has a malformed id all produce the same 404, so ids cannot be probed.
 */
function ownedFilter(req) {
  const { id } = req.params;
  if (!OBJECT_ID.test(id)) throw AppError.notFound(TASK_NOT_FOUND);
  return { _id: id, userId: req.user.id };
}

/** GET /api/tasks (FR-05): the signed-in user's tasks, newest first. */
const listTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1, _id: -1 });
  res.json({ tasks, count: tasks.length });
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
