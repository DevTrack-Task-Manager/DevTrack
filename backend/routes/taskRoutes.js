'use strict';

const express = require('express');
const controller = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authMiddleware');
const { validateCreateTask, validateUpdateTask } = require('../utils/taskValidators');

/** Every task route requires a valid JWT (FR-03). Ownership is enforced in the controller (FR-11). */
function createTaskRouter() {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', controller.listTasks);
  router.post('/', validate(validateCreateTask), controller.createTask);
  router.put('/:id', validate(validateUpdateTask), controller.updateTask);
  router.delete('/:id', controller.deleteTask);

  return router;
}

module.exports = createTaskRouter;
