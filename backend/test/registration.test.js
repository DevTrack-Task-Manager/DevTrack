const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const createApp = require("../app");

function createFakePool() {
  const users = [];

  return {
    users,
    async query(sql, values) {
      if (users.some((u) => u.email === values[1])) {
        const error = new Error("Duplicate email");
        error.code = "23505";
        throw error;
      }

      const user = {
        id: users.length + 1,
        name: values[0],
        email: values[1],
        password_hash: values[2],
        created_at: new Date().toISOString(),
      };

      users.push(user);
      return {
        rows: [{
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
        }],
      };
    },
  };
}

test("registers a user and never returns the password hash", async () => {
  const pool = createFakePool();
  const app = createApp(pool);

  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email: "TEST@demo.com",
      password: "Test@123",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, "test@demo.com");
  assert.equal("password_hash" in response.body.user, false);
  assert.equal("password" in response.body.user, false);
  assert.equal(pool.users.length, 1);
  assert.notEqual(pool.users[0].password_hash, "Test@123");
  assert.equal(
    await bcrypt.compare("Test@123", pool.users[0].password_hash),
    true
  );
});

test("rejects missing required fields", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/register")
    .send({ name: "Test User" });

  assert.equal(response.status, 400);
});

test("rejects invalid email", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/register")
    .send({ name: "Test User", email: "abc.com", password: "Test@123" });

  assert.equal(response.status, 400);
});

test("rejects a password shorter than six characters", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/register")
    .send({ name: "Test User", email: "test@demo.com", password: "123" });

  assert.equal(response.status, 400);
});

test("rejects duplicate email addresses", async () => {
  const pool = createFakePool();
  const app = createApp(pool);
  const user = {
    name: "Test User",
    email: "test@demo.com",
    password: "Test@123",
  };

  assert.equal(
    (await request(app).post("/api/auth/register").send(user)).status,
    201
  );

  const duplicate = await request(app)
    .post("/api/auth/register")
    .send({ ...user, name: "Another User" });

  assert.equal(duplicate.status, 409);
  assert.equal(pool.users.length, 1);
});
