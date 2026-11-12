# DevTrack: Task Manager Application
## Software Unit Test Report (UTR)

**Document Identifier:** DEVTRACK-UTR-v2.0  
**Project:** DevTrack — Task Manager Application  
**Standard:** IEEE Std 829-2008 (Standard for Software and System Test Documentation)  
**Date:** November 12, 2026  
**Authors:** Chiranthan HG (QA/Test Lead — PES1UG24CS564), Akula Sai Nandan Royal (Dev Lead — PES1UG24CS553)  
**Reviewed By:** Anirudh Dharane (Project Manager — PES1UG24CS563), Mohith N (SRS Lead — PES1UG24CS572)  
**Status:** Approved / Sprint 1 & 2 Execution Complete  

---

## 1. Executive Summary

This **Software Unit Test Report (UTR)** documents the comprehensive execution of all unit and isolated component test suites for the DevTrack Task Manager Application, encompassing both the Node.js/Express backend API and the React (Vite) client.

Unit testing was performed throughout Sprint 1 and Sprint 2 in accordance with the project Test Plan and IEEE 829 standards. The test harness validated all individual functions, utility algorithms, schema constraints, validation middlewares, cryptographic operations, state stores, and isolated React UI components.

### 1.1 Key Results Dashboard

| Metric | Backend (Node.js/Jest) | Frontend (React/Vitest) | Overall System |
|---|---|---|---|
| **Test Suites** | 12 | 15 | **27 Suites** |
| **Total Unit Tests** | 197 | 158 | **355 Tests** |
| **Tests Passed** | 197 | 158 | **355 Passed** |
| **Tests Failed** | 0 | 0 | **0 Failed** |
| **Tests Skipped** | 0 | 0 | **0 Skipped** |
| **Pass Rate** | **100.0%** | **100.0%** | **100.0%** |
| **Execution Duration** | 6.72 s | 10.81 s | **17.53 s** |
| **Execution Status** | **PASSED** | **PASSED** | **PASSED** |

---

## 2. Test Environment and Harness Configuration

The unit test framework was configured to run hermetically without external dependencies or live database instances.

| Component | Backend Environment | Client Environment |
|---|---|---|
| **Runtime** | Node.js v22.x LTS (x64) | Node.js v22.x LTS (x64) |
| **Test Runner** | Jest v29.7.0 (`--runInBand`) | Vitest v2.1.8 |
| **DOM Simulation** | N/A (Headless API Runtime) | JSDOM v25.0.1 |
| **Assertion Library** | Jest Expect | Vitest Expect / `@testing-library/jest-dom` |
| **Component Testing**| Supertest v7.0.0 (HTTP Mocking) | `@testing-library/react` v16.1.0 |
| **User Simulation** | Programmatic Function Invocations| `@testing-library/user-event` v14.5.2 |
| **Configuration** | `jest.config.js` / isolated environment | `vite.config.js` (`setupFiles: setup.js`) |

---

## 3. Backend Unit Test Results (12 Suites, 197 Tests)

The backend unit tests execute against isolated modules, testing pure functions, validation pipelines, data schemas, and error boundaries.

```
PASS tests/unit/taskValidators.test.js
PASS tests/unit/token.test.js
PASS tests/unit/taskQueryValidator.test.js
PASS tests/unit/password.test.js
PASS tests/unit/userModel.test.js
PASS tests/unit/taskModel.test.js
PASS tests/unit/db.test.js
PASS tests/unit/validateMiddleware.test.js
PASS tests/unit/errorHandler.test.js
PASS tests/unit/validators.test.js
PASS tests/unit/config.test.js
PASS tests/unit/profileValidator.test.js
```

### 3.1 Backend Test Suites Breakdown

#### 3.1.1 Authentication & Cryptography (`tests/unit/password.test.js`, `tests/unit/token.test.js`)
* **Test Plan IDs:** UT_06, UT_07, SEC-01, SEC-02
* **Total Tests:** 28 tests | **Passed:** 28 | **Failed:** 0
* **Scope & Verifications:**
  * Validates bcrypt password hashing with minimum 10 rounds (default: 12 rounds per `SEC-01`).
  * Enforces bcrypt's 72-byte ceiling to prevent truncation exploits.
  * Validates JWT token generation, payload encoding (`userId`, `email`), and 24-hour expiration calculation.
  * Confirms strict algorithm pinning to `HS256`, rejecting `none` algorithms, forged signatures, and malformed header tokens.
  * Verifies constant-time comparison behavior to prevent timing attacks.

#### 3.1.2 Input Validation Engine (`tests/unit/validators.test.js`, `tests/unit/validateMiddleware.test.js`)
* **Test Plan IDs:** UT_01, UT_02, UT_03, UT_04, UT_05, FR-12
* **Total Tests:** 38 tests | **Passed:** 38 | **Failed:** 0
* **Scope & Verifications:**
  * User registration and login input validators (email regex conforming to RFC 5322, password complexity rules).
  * Validates that empty fields produce explicit field-level error messages (`"Name is required"`, `"Enter a valid email address"`).
  * Rejects non-string inputs (e.g. `{ email: { "$gt": "" } }`) to prevent NoSQL operator injection before reaching the controller.
  * Tests generic middleware wrappers (`validate.body`, `validate.params`, `validate.query`), ensuring valid data is attached to `req.validated*` and invalid inputs abort with HTTP 400.

#### 3.1.3 Task Domain Validation (`tests/unit/taskValidators.test.js`, `tests/unit/taskQueryValidator.test.js`)
* **Test Plan IDs:** UT_08, UT_09, UT_10, UT_11, FR-04, FR-06, FR-08, FR-09, FR-10
* **Total Tests:** 46 tests | **Passed:** 46 | **Failed:** 0
* **Scope & Verifications:**
  * Validates task creation and update payloads: title required (1–120 characters), description capped at 1000 characters.
  * Ensures HTML tags (`<script>`, `<b>`) and non-printable control characters are stripped from title and description.
  * Enforces strict enum values for `status` (`Pending`, `In Progress`, `Completed`) and `priority` (`Low`, `Medium`, `High`).
  * Validates MongoDB ObjectId hex format (24 characters) in route parameters, returning 400 for malformed IDs.
  * Validates query string filters (`?status=`, `?priority=`), rejecting nested objects, arrays, and unknown enum values with HTTP 400.

#### 3.1.4 User Profile & Account Management (`tests/unit/profileValidator.test.js`)
* **Test Plan IDs:** FR-15, Issue #7 / Deviations #28, #30
* **Total Tests:** 16 tests | **Passed:** 16 | **Failed:** 0
* **Scope & Verifications:**
  * Validates `PUT /api/auth/me` request structure.
  * Allows updating display name without providing current password.
  * Strictly requires `currentPassword` when changing the email address.
  * Rejects duplicate email submissions and invalid formatting with HTTP 400.

#### 3.1.5 Database Models & Schemas (`tests/unit/userModel.test.js`, `tests/unit/taskModel.test.js`)
* **Test Plan IDs:** FR-01, FR-04, FR-11, SEC-01
* **Total Tests:** 32 tests | **Passed:** 32 | **Failed:** 0
* **Scope & Verifications:**
  * `User` schema: unique lowercase email index, pre-save hook that rejects plaintext passwords (must match bcrypt hash regex).
  * Enforces `toJSON` transform that strips `passwordHash` and `__v` from returned objects.
  * `Task` schema: foreign key `userId` reference to User collection, compound index `{ userId: 1, createdAt: -1 }` ensuring fast single-user task queries and hard data isolation.
  * Default values verified: `status = 'Pending'`, `priority = 'Medium'`.

#### 3.1.6 Infrastructure, Error Handling, and Config (`tests/unit/config.test.js`, `tests/unit/errorHandler.test.js`, `tests/unit/db.test.js`)
* **Test Plan IDs:** FR-12, NFR-03, NFR-05, SEC-02
* **Total Tests:** 37 tests | **Passed:** 37 | **Failed:** 0
* **Scope & Verifications:**
  * `config/env.js`: verifies mandatory presence of `JWT_SECRET` (at least 32 characters), default port 5000, bcrypt rounds >= 10.
  * Central error handler: transforms `AppError`, Mongoose `ValidationError`, `CastError`, duplicate key (E11000), and rate limit errors into standardized `{ error, fields }` payloads.
  * Sanitizes internal error messages in production: stack traces and raw driver messages are never exposed to the client.
  * Database connection pooling, retry logic with exponential backoff, and graceful teardown on SIGINT/SIGTERM.

---

## 4. Frontend Unit & Component Test Results (15 Suites, 158 Tests)

Frontend unit and component tests execute in a mocked JSDOM environment, verifying state management, utility helpers, custom hooks, and React UI components.

```
PASS src/test/api.test.js (12 tests)
PASS src/test/taskHelpers.test.js (16 tests)
PASS src/test/TaskPriority.test.jsx (8 tests)
PASS src/test/TaskStatus.test.jsx (11 tests)
PASS src/test/AuthSession.test.jsx (11 tests)
PASS src/test/validators.test.js (13 tests)
PASS src/test/taskUtils.test.js (7 tests)
PASS src/test/TaskFilters.test.jsx (11 tests)
PASS src/test/LoginPage.test.jsx (13 tests)
PASS src/test/RegisterPage.test.jsx (6 tests)
PASS src/test/DashboardFeatures.test.jsx (17 tests)
PASS src/test/Profile.test.jsx (12 tests)
PASS src/test/DashboardPage.test.jsx (17 tests)
PASS src/test/taskService.test.js (3 tests)
PASS src/test/SessionRevoked.test.jsx (1 test)
```

### 4.1 Frontend Test Suites Breakdown

#### 4.1.1 Authentication & Token Store (`src/test/api.test.js`, `src/test/AuthSession.test.jsx`, `src/test/SessionRevoked.test.jsx`)
* **Test Plan IDs:** UT_06, ST_04, ST_06, FR-13
* **Total Tests:** 24 tests | **Passed:** 24 | **Failed:** 0
* **Scope & Verifications:**
  * `tokenStore`: persists session in `localStorage` when "Keep me signed in" is checked, or `sessionStorage` when unchecked.
  * Automatically discards expired tokens on read and dispatches session-cleared events.
  * Intercepts 401 Unauthorized API responses and automatically logs out the user.
  * Verifies multi-tab synchronization and immediate session revocation.

#### 4.1.2 Form Validation & Utilities (`src/test/validators.test.js`, `src/test/taskHelpers.test.js`, `src/test/taskUtils.test.js`)
* **Test Plan IDs:** UT_01, UT_03, UT_05, FR-08, FR-09, FR-10
* **Total Tests:** 36 tests | **Passed:** 36 | **Failed:** 0
* **Scope & Verifications:**
  * Client-side email formatting and real-time password strength meter (Weak, Fair, Strong).
  * Dashboard summary calculations: `summarizeTasks`, completion percentage calculations without divide-by-zero errors.
  * In-memory search algorithm matching both title and description (case-insensitive, whitespace-trimmed).
  * In-memory sort functions: Newest, Oldest, Due Date, Priority (High -> Medium -> Low), Status, and Alphabetical.

#### 4.1.3 Authentication Pages (`src/test/RegisterPage.test.jsx`, `src/test/LoginPage.test.jsx`)
* **Test Plan IDs:** UT_01, UT_03, UT_04, UT_05, IT_02, IT_04, IT_05, ST_01
* **Total Tests:** 19 tests | **Passed:** 19 | **Failed:** 0
* **Scope & Verifications:**
  * Register page prevents empty submissions and shows inline field error labels.
  * Displays password complexity requirements when password is shorter than 6 characters.
  * Redirects to `/login` upon successful registration with prefilled email.
  * Displays server-side 409 duplicate email error inline on the email field.
  * Login page handles valid sign-in, wrong credentials (401), rate limits (429), and network disconnects.

#### 4.1.4 Dashboard & Task CRUD (`src/test/DashboardPage.test.jsx`, `src/test/DashboardFeatures.test.jsx`, `src/test/taskService.test.js`)
* **Test Plan IDs:** UT_08, UT_12, FR-04, FR-05, FR-06, FR-07, FR-10
* **Total Tests:** 37 tests | **Passed:** 37 | **Failed:** 0
* **Scope & Verifications:**
  * Loading state skeletons render during initial API task fetching.
  * Task creation modal: opens on click, validates input, closes on success, inserts new task at the top of the list.
  * Preserves form inputs if API returns a field validation error.
  * Escape key and Cancel button close modals without mutating data.
  * Task editing: modal prefills with existing task values and submits partial `PUT` updates.
  * Full-width dashboard layout without unnecessary side panels.

#### 4.1.5 Interactive Task Workflows (`src/test/TaskStatus.test.jsx`, `src/test/TaskPriority.test.jsx`, `src/test/TaskFilters.test.jsx`)
* **Test Plan IDs:** UT_13, UT_14, UT_15, FR-08, FR-09, FR-10
* **Total Tests:** 30 tests | **Passed:** 30 | **Failed:** 0
* **Scope & Verifications:**
  * One-click status transitions: "Start" (Pending -> In Progress), "Complete" (In Progress -> Completed), "Reopen" (Completed -> Pending).
  * Double-click protection: status buttons are disabled during inflight HTTP requests.
  * Optimistic UI update rollbacks if server returns an error.
  * Task card priority dropdown (`Low`, `Medium`, `High`) sends instant `PUT` request and updates badge.
  * Filter panel: combines Status AND Priority dropdowns, toggles "Clear filters" button, handles empty result states.

#### 4.1.6 User Profile Component (`src/test/Profile.test.jsx`)
* **Test Plan IDs:** FR-15, Deviations #28, #30
* **Total Tests:** 12 tests | **Passed:** 12 | **Failed:** 0
* **Scope & Verifications:**
  * Renders user information (name, email, member since, session expiry).
  * Allows updating user name independently.
  * Requires password confirmation when requesting email change.
  * Handles server rejection (email taken, wrong password) with inline field errors.

---

## 5. Traceability Matrix: Unit Tests to SRS Requirements

| Requirement ID | Requirement Description | Unit Test Suite(s) | Status |
|---|---|---|---|
| **FR-01** | User Registration | `validators.test.js`, `userModel.test.js`, `RegisterPage.test.jsx` | **PASS** |
| **FR-02** | User Login | `validators.test.js`, `password.test.js`, `LoginPage.test.jsx` | **PASS** |
| **FR-03** | Token Authentication | `token.test.js`, `api.test.js`, `AuthSession.test.jsx` | **PASS** |
| **FR-04** | Create Task | `taskValidators.test.js`, `taskModel.test.js`, `DashboardPage.test.jsx` | **PASS** |
| **FR-05** | View User Tasks | `taskModel.test.js`, `DashboardPage.test.jsx`, `taskHelpers.test.js` | **PASS** |
| **FR-06** | Edit Task | `taskValidators.test.js`, `DashboardPage.test.jsx` | **PASS** |
| **FR-07** | Delete Task | `taskModel.test.js`, `DashboardPage.test.jsx` | **PASS** |
| **FR-08** | Status Workflow | `taskValidators.test.js`, `TaskStatus.test.jsx` | **PASS** |
| **FR-09** | Priority Assignment | `taskValidators.test.js`, `TaskPriority.test.jsx` | **PASS** |
| **FR-10** | Filter Tasks | `taskQueryValidator.test.js`, `TaskFilters.test.jsx`, `taskHelpers.test.js`| **PASS** |
| **FR-11** | User Data Isolation | `taskModel.test.js`, `userModel.test.js` | **PASS** |
| **FR-12** | Input Validation & Errors | `validateMiddleware.test.js`, `errorHandler.test.js`, page tests | **PASS** |
| **FR-13** | User Logout | `api.test.js`, `AuthSession.test.jsx` | **PASS** |
| **SEC-01** | Password Security (bcrypt >= 10) | `password.test.js`, `userModel.test.js` | **PASS** |
| **SEC-02** | JWT HS256 & Secret Entropy | `token.test.js`, `config.test.js` | **PASS** |
| **SEC-03** | Injection & XSS Defense | `taskValidators.test.js`, `validateMiddleware.test.js` | **PASS** |

---

## 6. Anomalies and Resolutions During Unit Testing

| Issue # | Component | Detected Condition | Corrective Action Applied | Verification Result |
|---|---|---|---|---|
| **ANO-01** | Client Tests | Node v22 WebStorage global shadowing caused `window.localStorage` method collision in JSDOM. | Added `--no-experimental-webstorage` flag to the test invocation environment. | All 158 client tests pass cleanly without environment warnings. |
| **ANO-02** | Validation | Malformed task IDs could cause unhandled MongoDB CastError exceptions. | Implemented custom ObjectId validator regex in `validate.params` returning 400 immediately. | Covered by `taskValidators.test.js` (HTTP 400 `Invalid task id`). |
| **ANO-03** | UI Cards | Rapid double-clicking on status buttons issued duplicate concurrent PUT requests. | Added disabled state to status action buttons while mutation is pending. | Verified in `TaskStatus.test.jsx` ("disables status buttons while saving"). |

---

## 7. Sign-off and Quality Assurance Approval

The unit testing phase for DevTrack has achieved **100% test pass rate** across all 355 unit tests. All functional requirements, validation constraints, and security objectives allocated to unit testing are fully verified.

| Role | Name | Signature | Date |
|---|---|---|---|
| **QA / Test Lead** | Chiranthan HG | *Chiranthan HG* | November 12, 2026 |
| **Dev Lead** | Akula Sai Nandan Royal | *Akula Sai Nandan Royal* | November 12, 2026 |
| **Project Manager** | Anirudh Dharane | *Anirudh Dharane* | November 12, 2026 |
| **Requirements Lead** | Mohith N | *Mohith N* | November 12, 2026 |

