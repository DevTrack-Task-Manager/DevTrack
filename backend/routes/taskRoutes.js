'use strict';

const express = require('express');
const controller = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authMiddleware');
const { validateCreateTask, validateUpdateTask, validateTaskParams, validateTaskQuery } = require('../utils/taskValidators');

/** Every task route requires a valid JWT (FR-03). Params and bodies are validated by middleware (FR-12); ownership is enforced in the controller (FR-11). */
function createTaskRouter() {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', validate.query(validateTaskQuery), controller.listTasks);
  router.post('/', validate(validateCreateTask), controller.createTask);
  // Params are checked before the body, so a bad id is reported as a bad id.
  router.put('/:id', validate.params(validateTaskParams), validate(validateUpdateTask), controller.updateTask);
  router.delete('/:id', validate.params(validateTaskParams), controller.deleteTask);

  return router;
}

module.exports = createTaskRouter;
