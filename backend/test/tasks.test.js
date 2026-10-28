const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../app");

const TEST_SECRET = "task-crud-test-secret-only";

function createFakePool(initialTasks = []) {
  const tasks = initialTasks.map((task) => ({ ...task }));
  let nextId = Math.max(0, ...tasks.map((task) => task.id)) + 1;

  return {
    tasks,

    async query(sql, values) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();

      if (normalizedSql.startsWith("INSERT INTO tasks")) {
        const [userId, title, description, status, dueDate] = values;
        const now = new Date().toISOString();
        const task = {
          id: nextId++,
          user_id: userId,
          title,
          description,
          status,
          due_date: dueDate,
          created_at: now,
          updated_at: now,
        };

        tasks.push(task);
        return { rows: [{ ...task }] };
      }

      if (normalizedSql.startsWith("SELECT") &&
          normalizedSql.includes("FROM tasks") &&
          normalizedSql.includes("WHERE id = $1 AND user_id = $2")) {
        const task = tasks.find(
          (item) => item.id === Number(values[0]) &&
                    item.user_id === Number(values[1])
        );

        return { rows: task ? [{ ...task }] : [] };
      }

      if (normalizedSql.startsWith("SELECT") &&
          normalizedSql.includes("FROM tasks") &&
          normalizedSql.includes("WHERE user_id = $1")) {
        return {
          rows: tasks
            .filter((task) => task.user_id === Number(values[0]))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((task) => ({ ...task })),
        };
      }

      if (normalizedSql.startsWith("UPDATE tasks")) {
        const taskId = Number(values[values.length - 2]);
        const userId = Number(values[values.length - 1]);
        const task = tasks.find(
          (item) => item.id === taskId && item.user_id === userId
        );

        if (!task) return { rows: [] };

        const setClause = normalizedSql.split(" SET ")[1].split(" WHERE ")[0];
        const fields = setClause.split(", ").filter(
          (field) => !field.startsWith("updated_at =")
        );

        fields.forEach((field, index) => {
          const column = field.split(" = ")[0];
          task[column] = values[index];
        });

        task.updated_at = new Date().toISOString();
        return { rows: [{ ...task }] };
      }

      if (normalizedSql.startsWith("DELETE FROM tasks")) {
        const taskId = Number(values[0]);
        const userId = Number(values[1]);
        const index = tasks.findIndex(
          (item) => item.id === taskId && item.user_id === userId
        );

        if (index === -1) return { rows: [] };

        const [deleted] = tasks.splice(index, 1);
        return { rows: [{ id: deleted.id }] };
      }

      throw new Error(`Unexpected SQL in test: ${normalizedSql}`);
    },
  };
}

function tokenFor(userId = 1) {
  return jwt.sign(
    { email: `user${userId}@example.com` },
    TEST_SECRET,
    { subject: String(userId), expiresIn: "1h" }
  );
}

function appFor(pool) {
  process.env.JWT_SECRET = TEST_SECRET;
  return createApp(pool);
}

const sampleTask = {
  id: 1,
  user_id: 1,
  title: "Finish assignment",
  description: "Complete CRUD implementation",
  status: "pending",
  due_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

test("rejects task requests without a JWT", async () => {
  const response = await request(appFor(createFakePool())).get("/api/tasks");

  assert.equal(response.status, 401);
});

test("creates a task for the authenticated user", async () => {
  const pool = createFakePool();

  const response = await request(appFor(pool))
    .post("/api/tasks")
    .set("Authorization", `Bearer ${tokenFor(1)}`)
    .send({
      title: "  Finish assignment  ",
      description: "CRUD work",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.task.title, "Finish assignment");
  assert.equal(response.body.task.user_id, 1);
  assert.equal(response.body.task.status, "pending");
  assert.equal(pool.tasks.length, 1);
});

test("rejects task creation with a blank title", async () => {
  const response = await request(appFor(createFakePool()))
    .post("/api/tasks")
    .set("Authorization", `Bearer ${tokenFor()}`)
    .send({ title: "   " });

  assert.equal(response.status, 400);
});

test("lists only tasks owned by the authenticated user", async () => {
  const pool = createFakePool([
    { ...sampleTask, id: 1, user_id: 1 },
    { ...sampleTask, id: 2, user_id: 2, title: "Private task" },
  ]);

  const response = await request(appFor(pool))
    .get("/api/tasks")
    .set("Authorization", `Bearer ${tokenFor(1)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.tasks.length, 1);
  assert.equal(response.body.tasks[0].user_id, 1);
});

test("reads a task owned by the authenticated user", async () => {
  const pool = createFakePool([sampleTask]);

  const response = await request(appFor(pool))
    .get("/api/tasks/1")
    .set("Authorization", `Bearer ${tokenFor(1)}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.task.title, sampleTask.title);
});

test("does not allow reading another user's task", async () => {
  const pool = createFakePool([sampleTask]);

  const response = await request(appFor(pool))
    .get("/api/tasks/1")
    .set("Authorization", `Bearer ${tokenFor(2)}`);

  assert.equal(response.status, 404);
});

test("updates a task owned by the authenticated user", async () => {
  const pool = createFakePool([sampleTask]);

  const response = await request(appFor(pool))
    .put("/api/tasks/1")
    .set("Authorization", `Bearer ${tokenFor(1)}`)
    .send({ title: "Updated assignment", status: "completed" });

  assert.equal(response.status, 200);
  assert.equal(response.body.task.title, "Updated assignment");
  assert.equal(response.body.task.status, "completed");
});

test("does not allow updating another user's task", async () => {
  const pool = createFakePool([sampleTask]);

  const response = await request(appFor(pool))
    .put("/api/tasks/1")
    .set("Authorization", `Bearer ${tokenFor(2)}`)
    .send({ title: "Unauthorized update" });

  assert.equal(response.status, 404);
  assert.equal(pool.tasks[0].title, sampleTask.title);
});

test("deletes a task owned by the authenticated user", async () => {
  const pool = createFakePool([sampleTask]);

  const response = await request(appFor(pool))
    .delete("/api/tasks/1")
    .set("Authorization", `Bearer ${tokenFor(1)}`);

  assert.equal(response.status, 200);
  assert.equal(pool.tasks.length, 0);
});

test("does not allow deleting another user's task", async () => {
  const pool = createFakePool([sampleTask]);

  const response = await request(appFor(pool))
    .delete("/api/tasks/1")
    .set("Authorization", `Bearer ${tokenFor(2)}`);

  assert.equal(response.status, 404);
  assert.equal(pool.tasks.length, 1);
});
