const express = require("express");
const bcrypt = require("bcryptjs");

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

  return router;
}

module.exports = createAuthRouter;
