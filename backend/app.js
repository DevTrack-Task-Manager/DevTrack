const express = require("express");
const cors = require("cors");
const createAuthRouter = require("./routes/auth");
const createTasksRouter = require("./routes/tasks");

function createApp(pool) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "20kb" }));

  app.get("/", (req, res) => {
    res.json({ message: "DevTrack backend is running" });
  });

  app.use("/api/auth", createAuthRouter(pool));
  app.use("/api/tasks", createTasksRouter(pool));

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    if (err.type === "entity.parse.failed") {
      return res.status(400).json({ error: "Invalid JSON request body." });
    }

    console.error("Request failed:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

module.exports = createApp;
