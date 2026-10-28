const express = require("express");
const authenticateToken = require("../middleware/auth");

function createTasksRouter(pool) {
  const router = express.Router();

  // Every task endpoint requires a valid JWT.
  router.use(authenticateToken);

  function getUserId(req) {
    const userId = Number(req.user.sub);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  }

  function validStatus(status) {
    return ["pending", "in_progress", "completed"].includes(status);
  }

  // Create a task.
  router.post("/", async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const { title, description = "", status = "pending", due_date = null } =
        req.body || {};

      if (!userId) {
        return res.status(401).json({ error: "Invalid authentication token." });
      }

      if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
        return res.status(400).json({
          error: "Title is required and must be at most 200 characters.",
        });
      }

      if (typeof description !== "string") {
        return res.status(400).json({ error: "Description must be a string." });
      }

      if (!validStatus(status)) {
        return res.status(400).json({ error: "Invalid task status." });
      }

      if (
        due_date !== null &&
        (typeof due_date !== "string" || Number.isNaN(Date.parse(due_date)))
      ) {
        return res.status(400).json({ error: "Invalid due_date." });
      }

      const result = await pool.query(
        `INSERT INTO tasks (user_id, title, description, status, due_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, title, description, status, due_date,
                   created_at, updated_at`,
        [userId, title.trim(), description, status, due_date]
      );

      return res.status(201).json({ task: result.rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  // List only the authenticated user's tasks.
  router.get("/", async (req, res, next) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Invalid authentication token." });
      }

      const result = await pool.query(
        `SELECT id, user_id, title, description, status, due_date,
                created_at, updated_at
         FROM tasks
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return res.status(200).json({ tasks: result.rows });
    } catch (error) {
      return next(error);
    }
  });

  // Read one task owned by the authenticated user.
  router.get("/:id", async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const taskId = Number(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Invalid authentication token." });
      }

      if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID." });
      }

      const result = await pool.query(
        `SELECT id, user_id, title, description, status, due_date,
                created_at, updated_at
         FROM tasks
         WHERE id = $1 AND user_id = $2`,
        [taskId, userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Task not found." });
      }

      return res.status(200).json({ task: result.rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  // Update only fields provided by the user.
  router.put("/:id", async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const taskId = Number(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Invalid authentication token." });
      }

      if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID." });
      }

      const allowedFields = ["title", "description", "status", "due_date"];
      const body = req.body || {};
      const keys = Object.keys(body);

      if (!keys.length || keys.some((key) => !allowedFields.includes(key))) {
        return res.status(400).json({ error: "Provide valid task fields to update." });
      }

      if (
        "title" in body &&
        (typeof body.title !== "string" ||
          !body.title.trim() ||
          body.title.trim().length > 200)
      ) {
        return res.status(400).json({ error: "Invalid task title." });
      }

      if ("description" in body && typeof body.description !== "string") {
        return res.status(400).json({ error: "Description must be a string." });
      }

      if ("status" in body && !validStatus(body.status)) {
        return res.status(400).json({ error: "Invalid task status." });
      }

      if (
        "due_date" in body &&
        body.due_date !== null &&
        (typeof body.due_date !== "string" ||
          Number.isNaN(Date.parse(body.due_date)))
      ) {
        return res.status(400).json({ error: "Invalid due_date." });
      }

      const columns = {
        title: "title",
        description: "description",
        status: "status",
        due_date: "due_date",
      };

      const values = [];
      const assignments = [];

      for (const key of keys) {
        values.push(key === "title" ? body[key].trim() : body[key]);
        assignments.push(`${columns[key]} = $${values.length}`);
      }

      values.push(taskId);
      const taskIdPlaceholder = `$${values.length}`;
      values.push(userId);
      const userIdPlaceholder = `$${values.length}`;

      const result = await pool.query(
        `UPDATE tasks
         SET ${assignments.join(", ")}, updated_at = NOW()
         WHERE id = ${taskIdPlaceholder} AND user_id = ${userIdPlaceholder}
         RETURNING id, user_id, title, description, status, due_date,
                   created_at, updated_at`,
        values
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Task not found." });
      }

      return res.status(200).json({ task: result.rows[0] });
    } catch (error) {
      return next(error);
    }
  });

  // Delete only a task owned by the authenticated user.
  router.delete("/:id", async (req, res, next) => {
    try {
      const userId = getUserId(req);
      const taskId = Number(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Invalid authentication token." });
      }

      if (!Number.isSafeInteger(taskId) || taskId <= 0) {
        return res.status(400).json({ error: "Invalid task ID." });
      }

      const result = await pool.query(
        "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
        [taskId, userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Task not found." });
      }

      return res.status(200).json({ message: "Task deleted successfully." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createTasksRouter;
