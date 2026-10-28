
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function createAuthRouter(pool) {
  const router = express.Router();

  router.post("/register", async (req, res, next) => {
    try {
      const { name, email, password } = req.body || {};

      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !name.trim() ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({
          error: "Name, email and password are required.",
        });
      }

      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedName.length > 100) {
        return res.status(400).json({
          error: "Name must be 100 characters or fewer.",
        });
      }

      if (
        normalizedEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        return res.status(400).json({
          error: "Enter a valid email address.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: "Password too weak. Minimum length is 6 characters.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [normalizedName, normalizedEmail, passwordHash]
      );

      return res.status(201).json({
        message: "User registered successfully.",
        user: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "Email already registered.",
        });
      }

      return next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const { email, password } = req.body || {};

      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({
          error: "Email and password are required.",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (
        normalizedEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        return res.status(400).json({
          error: "Enter a valid email address.",
        });
      }

      const result = await pool.query(
        `SELECT id, name, email, password_hash
         FROM users
         WHERE email = $1`,
        [normalizedEmail]
      );

      const user = result.rows[0];

      if (
        !user ||
        !(await bcrypt.compare(password, user.password_hash))
      ) {
        return res.status(401).json({
          error: "Invalid email or password.",
        });
      }

      const secret = process.env.JWT_SECRET;

      if (!secret) {
        return res.status(500).json({
          error: "Authentication is not configured.",
        });
      }

      const token = jwt.sign(
        { email: user.email },
        secret,
        {
          subject: String(user.id),
          expiresIn: "1h",
        }
      );

      return res.status(200).json({
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createAuthRouter;
