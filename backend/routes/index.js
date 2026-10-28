'use strict';

const express = require('express');
const createAuthRouter = require('./authRoutes');

/** Mounts every feature router under /api. Task routes arrive with Issue #4. */
function createApiRouter({ rateLimit }) {
  const router = express.Router();
  router.use('/auth', createAuthRouter(rateLimit));
  return router;
}

module.exports = createApiRouter;
