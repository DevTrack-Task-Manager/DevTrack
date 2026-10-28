const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const createApp = require("../app");

const TEST_SECRET = "auth-me-test-secret-only";

test("GET /api/auth/me rejects requests without a token", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const response = await request(createApp({ query: async () => ({ rows: [] }) }))
    .get("/api/auth/me");

  assert.equal(response.status, 401);
});

test("GET /api/auth/me returns claims from a valid token", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const token = jwt.sign(
    { email: "test@example.com" },
    TEST_SECRET,
    { subject: "42", expiresIn: "1h" }
  );

  const response = await request(createApp({ query: async () => ({ rows: [] }) }))
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    user: {
      id: "42",
      email: "test@example.com",
    },
  });
});
