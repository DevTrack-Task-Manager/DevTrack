'use strict';

const mongoose = require('mongoose');

const TASK_STATUSES = Object.freeze(['Pending', 'In Progress', 'Completed']); // FR-08
const TASK_PRIORITIES = Object.freeze(['Low', 'Medium', 'High']); // FR-09
const DEFAULT_STATUS = 'Pending'; // Test Plan UT_09
const DEFAULT_PRIORITY = 'Medium'; // Issue #6 asks for a documented default (see DEVIATIONS.md)
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000; // Issue #4: server-side cap, plain text only

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task owner is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [DESCRIPTION_MAX, `Description must be at most ${DESCRIPTION_MAX} characters`],
    },
    status: {
      type: String,
      enum: { values: TASK_STATUSES, message: 'Status must be Pending, In Progress or Completed' },
      default: DEFAULT_STATUS,
    },
    priority: {
      type: String,
      enum: { values: TASK_PRIORITIES, message: 'Priority must be Low, Medium or High' },
      default: DEFAULT_PRIORITY,
    },
    dueDate: { type: Date, default: null }, // optional; null clears it
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Dashboard list: newest first, per owner (FR-05).
taskSchema.index({ userId: 1, createdAt: -1 });
// Filtering by status and/or priority, per owner (FR-10).
taskSchema.index({ userId: 1, status: 1, priority: 1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

module.exports = Task;
module.exports.TASK_STATUSES = TASK_STATUSES;
module.exports.TASK_PRIORITIES = TASK_PRIORITIES;
module.exports.DEFAULT_STATUS = DEFAULT_STATUS;
module.exports.DEFAULT_PRIORITY = DEFAULT_PRIORITY;
module.exports.TITLE_MAX = TITLE_MAX;
module.exports.DESCRIPTION_MAX = DESCRIPTION_MAX;
