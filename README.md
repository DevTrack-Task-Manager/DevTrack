# DevTrack: Task Manager Application

A modern, responsive, full-stack web task manager. Register, sign in, and securely manage your personal tasks from an interactive React dashboard backed by a robust Node.js/Express RESTful API and MongoDB.

* **Stack:** React 18 (Vite SPA) · Node.js 22 + Express 4 · MongoDB (Mongoose) · JWT (HS256) · bcryptjs
* **Team:**
  * **Anirudh Dharane (PM — PES1UG24CS563):** Project scaffolding, CI/CD pipelines, Agile backlog management, integration testing.
  * **Mohith N (SRS Lead — PES1UG24CS572):** Software Requirements Specification, use case modeling, functional verification.
  * **Chiranthan HG (QA Lead — PES1UG24CS564):** Test planning, automated test suites (Jest/Vitest), code & branch coverage, IEEE documentation.
  * **Akula Sai Nandan Royal (Dev Lead — PES1UG24CS553):** Backend architecture, MongoDB schemas, Express controllers, route security, JWT authentication.

---

## 1. Project Implementation Status (Sprint 1 & Sprint 2 Complete)

Both **Sprint 1** and **Sprint 2** development activities have been completed and frozen. All functional requirements (FR-01 to FR-13), non-functional constraints (NFR-01 to NFR-06), and security objectives (SEC-01 to SEC-03) are fully implemented and verified.

| Feature Area | Associated Issues | Sprint | Implementation Status |
|---|---|---|---|
| **Scaffolding, CI & PR Template** | Phase A | Sprint 1 | **Done** (GitHub Actions CI workflow for backend & client) |
| **Environment Config & Setup** | #19 | Sprint 1 | **Done** (Validated `env.js`, connection retry, `.env.example`) |
| **Database Schemas & Models** | #9 | Sprint 1 | **Done** (`User` and `Task` Mongoose models, compound indexing) |
| **User Registration** | #1 | Sprint 1 | **Done** (Bcrypt hashing, RFC email validation, 409 duplicate check) |
| **User Login & Session** | #2 | Sprint 1 | **Done** (Credential verification, constant-time failure response) |
| **JWT Middleware & Auth Gating**| #3 | Sprint 1 | **Done** (HS256 algorithm pinning, 24h expiration, `/api/auth/me`) |
| **Client Shell & Route Guards** | Phase B | Sprint 1 | **Done** (`ProtectedRoute`, `GuestRoute`, `tokenStore`, dual persistence) |
| **Task CRUD Operations** | #4 | Sprint 2 | **Done** (Create, read, partial update via `PUT`, delete with modal) |
| **Dynamic Status Transitions** | #5 | Sprint 2 | **Done** (One-click shortcuts: Pending -> In Progress -> Completed -> Reopen) |
| **Priority Management** | #6 | Sprint 2 | **Done** (Card-level priority dropdown: Low, Medium, High; default: Medium) |
| **Status & Priority Filtering** | #7 | Sprint 2 | **Done** (Server-side query filtering: `?status=` and `?priority=`, AND logic) |
| **Interactive Dashboard & Metrics** | #8 | Sprint 2 | **Done** (Global summary counters, responsive card grid, empty states) |
| **Centralized Validation & Errors**| #10 | Sprint 2 | **Done** (Type guards, 400 `{ error, fields }`, NoSQL injection defense) |
| **Client Search & Multi-Sort** | #11, #12 | Sprint 2 | **Done** (In-memory title/desc search; 6 sort modes: date, priority, status) |
| **User Profile Management** | #15 | Sprint 2 | **Done** (`PUT /api/auth/me` name edit, password re-auth for email change) |
| **Automated Testing & QA Reports** | #20 | Sprint 2 | **Done** (355 Unit tests, 100 System tests, 91.9% branch coverage) |

---

## 2. Quick Start Guide

### Prerequisites
* **Node.js:** v20.x or v22.x LTS
* **npm:** v10.x+
* **MongoDB:** Local instance running on `localhost:27017` or a MongoDB Atlas connection string.

### Setup and Running Locally

```bash
# 1. Install all dependencies for root, backend, and client
npm run install:all          # or run npm install inside backend/ and client/
npm install                  # root workspace dependencies (concurrently)

# 2. Configure Backend Environment
cd backend
cp .env.example .env
npm run gen:secret           # generates a secure 64-char hex key; copy into JWT_SECRET in .env
# (Optional) Update DB_URI in backend/.env if MongoDB is on a remote or custom host
cd ..

# 3. Seed Demo Data (Optional - creates test accounts from Test Plan)
npm run seed                 # test@demo.com / Test@123, priya@demo.com / Priya@2024

# 4. Start Both Servers Concurrently
npm run dev                  # Launches API on http://localhost:5000 and React on http://localhost:5173
```

* **Health Verification:** `curl http://localhost:5000/health` returns `{"status":"ok", "database":"connected"}`.
* **Frontend Access:** Open `http://localhost:5173` in any modern web browser. Vite proxies `/api` requests to Express on port 5000 without CORS friction.

---

## 3. Environment Variables Configuration (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Yes | `5000` | Port for Express API server |
| `DB_URI` | Yes | `none` | MongoDB connection URI (`mongodb://localhost:27017/devtrack`) |
| `JWT_SECRET` | Yes | `none` | High-entropy secret (≥ 32 chars). Refuses startup if missing or placeholder |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated list) |
| `BCRYPT_ROUNDS` | No | `12` | Salt work factor (minimum 10 per `SEC-01`) |
| `LOGIN_RATE_LIMIT` | No | `10` | Maximum failed logins per IP within time window |
| `REGISTER_RATE_LIMIT`| No | `20` | Maximum registrations per IP within time window |
| `RATE_LIMIT_WINDOW_MINUTES` | No | `15` | Window duration in minutes for rate limiters |

---

## 4. RESTful API Specification

All error responses adhere to the standard schema: `{ "error": "Descriptive message", "fields": { "field": "error" } }`.

| Method | Endpoint | Authentication | Success Response | Error Codes | Description |
|---|---|---|---|---|---|
| `GET` | `/health` | Public | `200` `{ status: "ok", uptime, database }` | — | System health and database connectivity probe |
| `POST`| `/api/auth/register` | Public | `201` `{ message, user }` (no token) | `400, 409, 429` | Onboards user; enforces redirect to `/login` |
| `POST`| `/api/auth/login` | Public | `200` `{ token, tokenType, expiresAt, user }`| `400, 401, 429` | Verifies credentials; issues 24-hr HS256 JWT |
| `GET` | `/api/auth/me` | Bearer Token | `200` `{ user, session }` | `401` | Retrieves authenticated user profile & session info |
| `PUT` | `/api/auth/me` | Bearer Token | `200` `{ message, user }` | `400, 409, 401` | Updates name or email (requires password for email) |
| `POST`| `/api/auth/logout` | Bearer Token | `200` `{ message: "Logged out" }` | `401` | Confirms client token discard and session clearing |
| `GET` | `/api/tasks` | Bearer Token | `200` `{ tasks, count, summary }` | `400, 401` | Lists user tasks; accepts `?status=` and `?priority=` |
| `POST`| `/api/tasks` | Bearer Token | `201` `{ message, task }` | `400, 401` | Creates task (Title 1–120 chars, Desc ≤ 1000 chars) |
| `GET` | `/api/tasks/:id` | Bearer Token | `200` `{ task }` | `400, 401, 404` | Retrieves single task; foreign tasks return 404 |
| `PUT` | `/api/tasks/:id` | Bearer Token | `200` `{ message, task }` | `400, 401, 404` | Partial update of task fields, status, or priority |
| `DELETE`| `/api/tasks/:id`| Bearer Token | `200` `{ message: "Task deleted", id }` | `400, 401, 404` | Deletes task; foreign tasks return 404 |

---

## 5. Security & Architectural Enforcement

* **Password Security (SEC-01):** Hashed using `bcryptjs` with 12 rounds. User schema contains a pre-save hook that explicitly rejects any password not matching bcrypt hash signatures. Passwords are capped at 72 bytes to prevent bcrypt truncation vulnerabilities.
* **Token Hardening (SEC-02):** Cryptographically pinned to `HS256`. Requests attempting algorithm tampering (`alg: "none"` or RSA keys) are immediately rejected.
* **Tenant Isolation & Anti-Enumeration (SEC-03 / Deviation #3, #18):** When a user requests, modifies, or deletes a task belonging to someone else, the API strictly responds with **`HTTP 404 Not Found`** (`"Task not found"`), never `403 Forbidden`. This prevents attackers from enumerating valid task IDs.
* **NoSQL Injection Defense:** All incoming JSON fields are passed through strict `typeof === 'string'` type guards before reaching Mongoose queries. Object queries (`{ "$gt": "" }`) are rejected with `HTTP 400`.
* **XSS Defense:** Task descriptions strip HTML tags (`<script>`, `<iframe>`) server-side; React handles output escaping on rendering.
* **Rate Limiting:** Failed login attempts are throttled to 10 attempts per 15 minutes per IP address (returns `HTTP 429 Too Many Requests`).

---

## 6. Testing & Quality Assurance

DevTrack features an automated test harness with **100% passing test execution** and **91.9% branch coverage**.

### Running the Test Suites

```bash
# 1. Backend Unit Tests (12 Suites, 197 Tests - No Database Needed)
cd backend
npm run test:unit

# 2. Backend Code Coverage Report
npm run test:coverage

# 3. Backend Integration Tests (Requires Running MongoDB or TEST_DB_URI)
npm run test:integration

# 4. Frontend Unit & Component Tests (15 Suites, 158 Tests)
cd ../client
$env:NODE_OPTIONS="--no-experimental-webstorage"; npm test   # Windows PowerShell
# or: NODE_OPTIONS="--no-experimental-webstorage" npm test    # macOS / Linux
```

### Test Results Dashboard

| Test Level | Suites | Tests Executed | Passed | Failed | Pass Rate | Code Coverage | Branch Coverage |
|---|---|---|---|---|---|---|---|
| **Backend Unit** | 12 | 197 | 197 | 0 | **100%** | 93.1% (Lines) | 91.5% (Branches) |
| **Frontend Unit** | 15 | 158 | 158 | 0 | **100%** | 95.0% (Lines) | 92.1% (Branches) |
| **Integration / System** | 8 | 100 | 100 | 0 | **100%** | End-to-End | 91.9% (Composite) |
| **Total System** | **35** | **455** | **455** | **0** | **100%** | **> 92%** | **91.9%** |

---

## 7. Project Documentation Index

All formal project documentation and reports generated for academic evaluation, IEEE compliance, and viva preparation are located in the [`docs/`](docs/) directory and project root:

1. **Test Execution & Quality Reports (Part 3):**
   * [`docs/Unit_Test_Report.md`](docs/Unit_Test_Report.md): Detailed verification of all 355 unit tests with environment specifications and requirement mappings.
   * [`docs/Code_Coverage_Report.md`](docs/Code_Coverage_Report.md): Istanbul/Jest coverage breakdown, statement/line/function metrics, and quality gate evaluations.
   * [`docs/Branch_Coverage_Report.md`](docs/Branch_Coverage_Report.md): Detailed branch analysis covering 471 decision paths, mermaid decision trees, and edge conditions.
   * [`docs/System_Validation_Report.md`](docs/System_Validation_Report.md): Full-system integration verification, security validation (`SEC-01` to `SEC-03`), and NFR measurements.
   * [`docs/Updated_Test_Plan_v2.0.md`](docs/Updated_Test_Plan_v2.0.md): IEEE 829 test plan updated to reflect all Sprint 1 & 2 changes, anti-enumeration 404 updates, and Sprint 2 feature test cases.
2. **Architecture, Design & Requirements (Part 1 & 2):**
   * [`DEVIATIONS.md`](DEVIATIONS.md): Comprehensive catalog of 31 documented deviations and architectural decisions from initial design.
   * [`docs/Task_Manager_Application_SRS_Practical_2.docx`](docs/Task_Manager_Application_SRS_Practical_2.docx): Original IEEE Software Requirements Specification v1.0.
   * [`docs/Software_Architecture_Design_Specification_Task_Manager.docx`](docs/Software_Architecture_Design_Specification_Task_Manager.docx): Original IEEE Software Architecture and Design document v1.0.
   * [`docs/Software_Test_Plan_Task_Manager.docx`](docs/Software_Test_Plan_Task_Manager.docx): Original Software Test Plan v1.0 baseline.

---

## 8. Git Workflow and Collaboration

* **Branching Strategy:** `main` holds production releases; `dev` integrates sprint deliverables. Feature branches branch off `dev` using `feature/<issue-name>`.
* **Automated CI Checks:** GitHub Actions pipeline (`.github/workflows/ci.yml`) runs linting, unit tests, coverage verification, and build validation on every pull request.
* **Code Review & Pull Requests:** Assigned developers raise PRs using `.github/PULL_REQUEST_TEMPLATE.md`; a separate teammate conducts formal code review before merging into `dev`.

