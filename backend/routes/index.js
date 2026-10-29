'use strict';

const express = require('express');
const createAuthRouter = require('./authRoutes');
const createTaskRouter = require('./taskRoutes');

/** Mounts every feature router under /api. */
function createApiRouter({ rateLimit }) {
  const router = express.Router();
  router.use('/auth', createAuthRouter(rateLimit));
  router.use('/tasks', createTaskRouter());
  return router;
}

module.exports = createApiRouter;
