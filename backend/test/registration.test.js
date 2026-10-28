
const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const createApp = require("../app");

function createFakePool(initialUsers = []) {
  const users = initialUsers.map((user) => ({ ...user }));

  return {
    users,

    async query(sql, values) {
      // Simulate the PostgreSQL SELECT used by login.
      if (sql.includes("SELECT id, name, email, password_hash")) {
        const email = values[0];
        const user = users.find((entry) => entry.email === email);
        return { rows: user ? [{ ...user }] : [] };
      }

      // Simulate the unique email constraint for registration.
      if (users.some((user) => user.email === values[1])) {
        const error = new Error("Duplicate email");
        error.code = "23505";
        throw error;
      }

      // Simulate inserting a registered user.
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

const TEST_JWT_SECRET = "test-secret-only-for-automated-tests";

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

test("rejects missing registration fields", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/register")
    .send({ name: "Test User" });

  assert.equal(response.status, 400);
});

test("rejects an invalid registration email", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email: "abc.com",
      password: "Test@123",
    });

  assert.equal(response.status, 400);
});

test("rejects a registration password shorter than six characters", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/register")
    .send({
      name: "Test User",
      email: "test@demo.com",
      password: "123",
    });

  assert.equal(response.status, 400);
});

test("rejects duplicate registration emails", async () => {
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

test("logs in with valid credentials and returns a verifiable JWT", async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  const password = "Test@123";
  const passwordHash = await bcrypt.hash(password, 10);
  const pool = createFakePool([{
    id: 1,
    name: "Test User",
    email: "test@example.com",
    password_hash: passwordHash,
  }]);

  const response = await request(createApp(pool))
    .post("/api/auth/login")
    .send({ email: "TEST@example.com", password });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Login successful.");
  assert.equal(response.body.user.email, "test@example.com");
  assert.equal("password_hash" in response.body.user, false);
  assert.equal("password" in response.body.user, false);

  const decoded = jwt.verify(response.body.token, TEST_JWT_SECRET);
  assert.equal(decoded.sub, "1");
  assert.equal(decoded.email, "test@example.com");
  assert.ok(decoded.exp > decoded.iat);
});

test("rejects an incorrect login password", async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  const pool = createFakePool([{
    id: 1,
    name: "Test User",
    email: "test@example.com",
    password_hash: await bcrypt.hash("Test@123", 10),
  }]);

  const response = await request(createApp(pool))
    .post("/api/auth/login")
    .send({
      email: "test@example.com",
      password: "Wrong@123",
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Invalid email or password.");
});

test("rejects login for an unknown email", async () => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  const response = await request(createApp(createFakePool()))
    .post("/api/auth/login")
    .send({
      email: "unknown@example.com",
      password: "Test@123",
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Invalid email or password.");
});

test("rejects missing login fields", async () => {
  const response = await request(createApp(createFakePool()))
    .post("/api/auth/login")
    .send({ email: "test@example.com" });

  assert.equal(response.status, 400);
});
