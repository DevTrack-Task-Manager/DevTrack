# DevTrack: Task Manager Application

A web task manager. Register, sign in, and manage your own tasks from a React dashboard backed by a Node.js/Express API and MongoDB.

**Stack:** React (Vite) · Node.js + Express · MongoDB (Mongoose) · JWT (HS256) · bcrypt
**Team:** Anirudh Dharane (PM) · Mohith N (SRS) · Chiranthan HG (QA) · Akula Sai Nandan Royal (Dev Lead)

## What is built so far

| Area | Issues | Status |
| --- | --- | --- |
| Scaffolding, CI, PR template | Phase A | Done |
| Env config and setup docs | #19 | Done |
| Database: User and Task models, connection with retry | #9 | Done (models only, task routes come with #4) |
| Registration | #1 | Done |
| Login | #2 | Done |
| JWT middleware, `/api/auth/me` | #3 | Done |
| Login and register pages, auth context, API client, route guard | client shell | Done |
| Task CRUD, dashboard, status, priority, filters, validation sweep, API docs | #4 to #8, #10, #16, #20 | Next |

## Quick start

Requirements: Node.js 20+, and MongoDB running locally (or an Atlas connection string).

```bash
# 1. Install everything
npm run install:all          # or: cd backend && npm install, then cd ../client && npm install
npm install                  # root only, for the combined `npm run dev`

# 2. Configure the backend
cd backend
cp .env.example .env
npm run gen:secret           # copy the output into JWT_SECRET in .env
# edit DB_URI in .env if MongoDB is not on localhost
cd ..

# 3. (optional) create the demo accounts used in the Test Plan
npm run seed                 # test@demo.com / Test@123, priya@demo.com / Priya@2024

# 4. Run both servers
npm run dev                  # API on :5000, web app on :5173
```

Verify: `curl http://localhost:5000/health` returns `{"status":"ok", ... "database":"connected"}`, and http://localhost:5173 shows the sign in page. In dev, Vite proxies `/api` to the backend, so no CORS setup is needed.

The server refuses to start if `JWT_SECRET` is missing, shorter than 32 characters, or still the placeholder.

### Environment variables (`backend/.env`)

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | yes (in example) | 5000 | |
| `DB_URI` | yes | none | MongoDB connection string |
| `JWT_SECRET` | yes | none | 32+ characters. `npm run gen:secret` |
| `NODE_ENV` | no | development | `production` enables stricter logging |
| `CLIENT_ORIGIN` | no | http://localhost:5173 | Comma-separate several origins |
| `BCRYPT_ROUNDS` | no | 12 | Minimum 10 (SEC-01) |
| `LOGIN_RATE_LIMIT` | no | 10 | Failed logins per window per IP |
| `REGISTER_RATE_LIMIT` | no | 20 | Registrations per window per IP |
| `RATE_LIMIT_WINDOW_MINUTES` | no | 15 | |
| `TRUST_PROXY` | no | false | Set `true` behind a reverse proxy |

## Project structure

```
DevTrack/
├── .github/
│   ├── workflows/ci.yml            # lint + test + build for backend and client
│   └── PULL_REQUEST_TEMPLATE.md
├── backend/
│   ├── server.js                   # createApp() + start(): helmet, CORS, JSON parser, /health, errors
│   ├── config/    env.js db.js     # validated env, Mongo connect with retry
│   ├── models/    User.js Task.js
│   ├── controllers/ authController.js
│   ├── routes/    index.js authRoutes.js
│   ├── middleware/ authMiddleware.js validate.js rateLimiter.js errorHandler.js
│   ├── utils/     AppError password token validators asyncHandler logger
│   ├── scripts/   seed.js
│   └── tests/     unit/ integration/ helpers/
├── client/
│   └── src/
│       ├── components/  pages/  context/AuthContext.jsx  hooks/
│       ├── services/    api.js tokenStore.js authService.js
│       ├── utils/       validators.js forms.js
│       ├── styles/      tokens.css base.css components.css auth.css dashboard.css
│       └── test/
├── docs/                           # SRS, TDD, SAD, Test Plan
├── DEVIATIONS.md                   # every place we differ from the spec, and why
└── README.md
```

## API (so far)

All errors are `{ "error": "message" }`. Validation errors (400) and duplicate email (409) also include `"fields": { "email": "..." }`.

| Method | Path | Auth | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/health` | no | 200 status, uptime, database state | |
| POST | `/api/auth/register` | no | 201 `{ message, user }` | 400, 409 `Email already registered`, 429 |
| POST | `/api/auth/login` | no | 200 `{ token, tokenType, expiresAt, user }` | 400, 401 `Invalid credentials`, 429 |
| GET | `/api/auth/me` | Bearer | 200 `{ user, session }` | 401 `Authentication required`, `Token expired`, `Invalid token` |
| POST | `/api/auth/logout` | Bearer | 200 `{ message }` (token is not revoked, the client discards it) | 401 |

```bash
curl -X POST localhost:5000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@demo.com","password":"Test@123"}'
curl -X POST localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"test@demo.com","password":"Test@123"}'
curl localhost:5000/api/auth/me -H "Authorization: Bearer <token>"
```

## Security rules in the code

* Passwords: bcrypt, 10 or more rounds. The User model **refuses to save anything that is not a bcrypt hash**, so plaintext cannot reach the database. The hash is never returned by queries or responses.
* Tokens: HS256 only (`alg: none` and other algorithms are rejected), secret from the environment, fixed 24 hour expiry, issuer checked. A token for a deleted user stops working immediately.
* Login responds with the same `Invalid credentials` for a wrong password and an unknown email, and spends the same bcrypt time on both.
* Inputs must be strings, so `{ "$gt": "" }` style NoSQL injection is rejected with 400.
* Other users' resources return **404**, never 403 (applies from Issue #4).
* No stack traces in responses. Request bodies are capped at 10 kB.

## Testing

```bash
cd backend
npm test                    # unit + integration. Downloads a mongod binary on first run
TEST_DB_URI=mongodb://127.0.0.1:27017 npm test   # use your own MongoDB instead (CI does this)
npm run test:unit           # no database needed
npm run test:coverage

cd ../client
npm test
```

Test names carry the Test Plan IDs, so you can trace them:

| Test Plan IDs | Where |
| --- | --- |
| UT_01 to UT_05 | `backend/tests/unit/validators.test.js`, `client/src/test/validators.test.js`, page tests |
| UT_06, UT_07 | `backend/tests/unit/token.test.js` |
| IT_01 to IT_03 | `backend/tests/integration/register.test.js` |
| IT_04 to IT_07 | `backend/tests/integration/login.test.js` |
| IT_08 to IT_11 | `backend/tests/integration/protected.test.js` (against `/api/auth/me` until `/api/tasks` exists) |
| ST_01, ST_04 to ST_06, FR-13 | `client/src/test/*.test.jsx` (simulated in jsdom, still run them manually in a real browser) |

## Workflow

1. `git checkout dev && git pull`, then `git checkout -b feature/<short-name>`
2. Build one issue. Run its test cases.
3. Open a PR into `dev` with `Closes #N`. The assignee raises it, a different teammate reviews and merges.
4. Do not close issues by hand.
