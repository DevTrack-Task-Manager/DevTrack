'use strict';

const express = require('express');
const controller = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/authMiddleware');
const { createLoginLimiter, createRegisterLimiter } = require('../middleware/rateLimiter');
const { validateRegistration, validateLogin } = require('../utils/validators');

/** @param {{ windowMs: number, loginLimit: number, registerLimit: number }} limits */
function createAuthRouter(limits) {
  const router = express.Router();

  router.post('/register', createRegisterLimiter(limits), validate(validateRegistration), controller.register);
  router.post('/login', createLoginLimiter(limits), validate(validateLogin), controller.login);
  router.post('/logout', authenticate, controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}

module.exports = createAuthRouter;
