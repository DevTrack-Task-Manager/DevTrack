const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const authenticateToken = require("../middleware/auth");

const TEST_SECRET = "middleware-test-secret-only";

function createTestApp() {
  const app = express();

  app.get("/protected", authenticateToken, (req, res) => {
    res.status(200).json({
      message: "Access granted.",
      user: req.user,
    });
  });

  return app;
}

test("rejects requests without a token", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const response = await request(createTestApp()).get("/protected");

  assert.equal(response.status, 401);
});

test("rejects malformed authorization headers", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const response = await request(createTestApp())
    .get("/protected")
    .set("Authorization", "NotBearer abc");

  assert.equal(response.status, 401);
});

test("rejects invalid tokens", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const response = await request(createTestApp())
    .get("/protected")
    .set("Authorization", "Bearer invalid.token.value");

  assert.equal(response.status, 401);
});

test("rejects expired tokens", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const token = jwt.sign(
    { email: "test@example.com" },
    TEST_SECRET,
    { subject: "1", expiresIn: -1 }
  );

  const response = await request(createTestApp())
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 401);
});

test("allows valid tokens and attaches verified claims to req.user", async () => {
  process.env.JWT_SECRET = TEST_SECRET;

  const token = jwt.sign(
    { email: "test@example.com" },
    TEST_SECRET,
    { subject: "1", expiresIn: "1h" }
  );

  const response = await request(createTestApp())
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Access granted.");
  assert.equal(response.body.user.sub, "1");
  assert.equal(response.body.user.email, "test@example.com");
});
