# DevTrack: Task Manager Application
## Software Test Plan (Updated Specification — v2.0)

**Document Identifier:** DEVTRACK-STP-v2.0  
**Project:** DevTrack — Task Manager Application  
**Standard:** IEEE Std 829-2008 (Standard for Software and System Test Documentation)  
**Previous Baseline:** Software Test Plan v1.0 (`docs/Software_Test_Plan_Task_Manager.docx` / `docs/Test-Plan-Task-Manager.docx`)  
**Date:** November 12, 2026  
**Authors:** Chiranthan HG (QA/Test Lead — PES1UG24CS564), Akula Sai Nandan Royal (Dev Lead — PES1UG24CS553)  
**Reviewed By:** Anirudh Dharane (Project Manager — PES1UG24CS563), Mohith N (SRS Lead — PES1UG24CS572)  
**Status:** Approved / Sprint 1 & Sprint 2 Post-Execution Baseline  

---

## 1. Introduction

### 1.1 Purpose
This updated **Software Test Plan (v2.0)** supersedes the initial baseline test plan created prior to Sprint 1. It incorporates all modifications, refinements, and expansions resulting from the execution of **Sprint 1** and **Sprint 2**, satisfying the evaluation checklist criteria: *"Original test cases updated to reflect sprint changes"* and *"All tests executed according to the Test Plan"*.

### 1.2 Scope
The scope encompasses all automated and manual test levels for the full-stack DevTrack application:
* **Backend:** Node.js, Express, MongoDB (Mongoose), JWT authentication middleware, rate limiters, validation engine.
* **Frontend:** React (Vite SPA), state contexts, token stores, responsive dashboard UI, modals, custom hooks.
* **Test Categories:** Unit Testing, Integration Testing, System & User Flow Testing, Security & Penetration Validation, Non-Functional Performance & Usability Verification.

### 1.3 Key Updates from Baseline Test Plan v1.0
1. **Security Isolation & Anti-Enumeration (IT_30, IT_38–IT_41):** Updated expected HTTP response from `403 Forbidden` to **`404 Not Found`** when attempting to read, modify, or delete a task belonging to another user. This prevents malicious actors from enumerating valid task ObjectIds (Deviation #3, #4, #18).
2. **Malformed Resource Identifiers:** Route parameters with non-24-character hexadecimal MongoDB ObjectIds return **`400 Bad Request`** with `"Invalid task id"` rather than 404, separating syntax errors from authorization boundaries (Deviation #18).
3. **Deletion API Contract (IT_23):** Confirmed `DELETE /api/tasks/:id` returns **`200 OK`** with body `{ message: "Task deleted", id }` instead of a blank 204 No Content, enabling deterministic UI confirmation alerts (Deviation #17).
4. **Registration Tokenless Handshake (IT_01, ST_01):** Updated registration response to return user data **without an authentication token** (Deviation #12), enforcing redirect to the login screen for deliberate credential validation.
5. **Session Retention Model (ST_04, ST_06):** Formalized test cases distinguishing persistent storage (`window.localStorage` when "Keep me signed in" is active) from ephemeral storage (`window.sessionStorage` when inactive) (Deviation #13).
6. **Sprint 2 Feature Additions:**
   * Test coverage for status quick-action transitions: Pending -> In Progress -> Completed -> Reopen (Deviation #25).
   * Test coverage for task card inline priority selectors defaulting to `Medium` (Deviation #5, #26).
   * Test coverage for server-side combined query filters (`?status=` AND `?priority=`) (Deviation #27).
   * Test coverage for global `summary` metadata retention in task responses (Deviation #29).
   * Test coverage for client-side title/description search and 6-mode sorting (Deviation #28).
   * Test coverage for User Profile management (`PUT /api/auth/me`), including password re-authentication for email changes (Deviation #28, #30).

---

## 2. Test Items and System Architecture Under Test

* **API Server (`backend/server.js`):** Express application exporting `createApp()` with security middleware (Helmet, CORS, rate limiting, request size limits).
* **Identity Management (`backend/controllers/authController.js`):** User registration, bcrypt password hashing (12 rounds), login credential verification, JWT token issuance (HS256), and profile updates.
* **Task Management Engine (`backend/controllers/taskController.js`):** Complete CRUD endpoints with user ownership scoping, status transitions, priority handling, and aggregate summary generation.
* **Validation & Security Layer (`backend/middleware/` & `backend/utils/`):** Request body, parameter, and query string validators with strict string type guards preventing NoSQL injection.
* **Client Interface (`client/src/`):** React dashboard with real-time UI filtering, modal forms, inline field-level validation rendering, and dual storage adapters.

---

## 3. Features to be Tested

* **FT-01: User Registration & Onboarding (FR-01):** Field validation, RFC email formatting, password strength checking, duplicate email rejection (409), redirect to login.
* **FT-02: Authentication & Token Lifecycle (FR-02, FR-03, FR-13):** Login authentication, constant-time failure response, JWT signature integrity, 24-hour expiration, logout session clearing.
* **FT-03: Task Lifecycle Management (FR-04, FR-05, FR-06, FR-07):** Modal task creation, list retrieval, partial updates via `PUT`, confirmation dialog on deletion.
* **FT-04: Status & Priority Transitions (FR-08, FR-09):** One-click status buttons, card-level priority dropdowns, server validation of enum states.
* **FT-05: Filtering, Search, and Sorting (FR-10):** Combined query parameters (`?status=`, `?priority=`), client search across title/description, client sorting algorithms.
* **FT-06: Cross-Tenant Data Isolation (FR-11):** Preventing cross-user access; strictly returning 404 for foreign tasks.
* **FT-07: Error Handling & Security Resilience (FR-12, SEC-01 to SEC-03):** Uniform `{ error, fields }` payloads, NoSQL injection defense, XSS tag stripping, rate limiting.
* **FT-08: User Profile Management (FR-15):** Displaying account metrics, updating user name, re-authenticating password before allowing email change.

---

## 4. Features Not to be Tested (Out of Scope for Sprints 1 & 2)

* **OAuth2 / Social Login (Google, GitHub SSO):** Deferred to post-v2.0 roadmap; current scope restricted to email/password + JWT.
* **File / Image Attachments to Tasks:** Deferred per SRS Section 2.5 assumptions.
* **Multi-User Task Collaboration / Shared Workspaces:** DevTrack is scoped as a personal task manager; cross-tenant sharing is strictly prohibited by FR-11.
* **Server-side Cursor Pagination:** Deferred (Issue #17); full task payload is returned with client-side virtualization.

---

## 5. Test Approach and Execution Strategy

### 5.1 Test Levels
1. **Unit Testing:** Isolated execution of pure functions, utility algorithms, schema models, and single React components using Jest (backend) and Vitest + Testing Library (frontend).
2. **Integration Testing:** Subsystem testing verifying communication between Express routers, validation middleware, controllers, and MongoDB models using Supertest.
3. **System & Acceptance Testing:** End-to-end verification of user scenarios, multi-tab session handling, and simulated browser interactions.

### 5.2 Security Validation Strategy (Section 5.1 / 5.4)
Dedicated security test cases are executed against every exposed route:
* **SEC-01 (Password Hashing):** Enforce minimum 10 rounds of bcrypt (implemented as 12 rounds); verify that the User schema pre-save hook rejects plaintext strings. Verify 72-byte truncation boundary.
* **SEC-02 (Token Integrity):** Inject tokens signed with foreign secrets, tokens with `alg: "none"`, and expired tokens to ensure 100% rejection with HTTP 401.
* **SEC-03 (Tenant Isolation & Anti-Enumeration):** Guarantee that User A can never detect the existence of User B's task IDs through timing or distinct error codes (always 404).
* **SEC-04 (Rate Limiting):** Verify IP-based throttling on auth endpoints (10 failed logins per 15 minutes trigger HTTP 429).
* **SEC-05 (Injection & Sanitization):** Submit NoSQL operator objects (`{ "$gt": "" }`) and HTML tags (`<script>`) to verify strict rejection or sanitization.

### 5.3 Entry and Exit Criteria
* **Entry Criteria:** Complete build with zero syntax errors, dependencies installed via lockfiles, database connection established.
* **Exit Criteria:**
  * 100% of planned unit, integration, and security test cases execute successfully.
  * Code statement coverage ≥ 80% and branch coverage ≥ 80% across critical application logic.
  * Zero high-severity defects remaining unresolved.

---

## 6. Updated Test Cases Specification

### 6.1 Unit Test Cases (UT_01 to UT_18)

| Test ID | Module Under Test | Description / Precondition | Test Input / Action | Expected Result | Traceability |
|---|---|---|---|---|---|
| **UT_01** | `validators.js` | Form validation: empty inputs | Submit empty registration form | Rejects with required field errors for name, email, password | FR-01, FR-12 |
| **UT_02** | `validators.js` | Email RFC format validation | Supply invalid emails (`test@`, `plain`, `@demo.com`) | Returns `"Enter a valid email address"` | FR-01, FR-12 |
| **UT_03** | `validators.js` | Password strength criteria | Supply password with < 6 characters | Returns `"Password too weak (minimum 6 characters)"` | FR-01, SEC-01 |
| **UT_04** | `validators.js` | Login empty validation | Submit empty login form | Rejects without dispatching network request | FR-02, FR-12 |
| **UT_05** | `validators.js` | Login email format | Submit malformed email on login | Returns inline error `"Enter a valid email address"` | FR-02, FR-12 |
| **UT_06** | `token.js` | Token creation & payload | Generate token for User with ID and email | Token contains signed claims, `exp` set to +24h, signed with HS256 | FR-03, SEC-02 |
| **UT_07** | `token.js` | Token algorithm enforcement | Attempt verification with header `alg: 'none'` | Rejects token, throws verification error | FR-03, SEC-02 |
| **UT_08** | `taskValidators.js` | Task title length constraints | Title = `""` or title > 120 chars | Rejects with 400 and explicit length bounds message | FR-04, FR-12 |
| **UT_09** | `taskValidators.js` | Task description length | Description > 1000 chars | Rejects with 400 `"Description cannot exceed 1000 characters"` | FR-04, FR-12 |
| **UT_10** | `taskValidators.js` | Description HTML sanitization | Input `<script>alert(1)</script>Safe text` | HTML tags stripped; safe text preserved | FR-04, SEC-05 |
| **UT_11** | `taskValidators.js` | Enum value verification | Status = `'Unknown'`, Priority = `'Urgent'` | Rejects with 400 naming valid enum options | FR-08, FR-09 |
| **UT_12** | `taskModel.js` | Model defaults & schema | Create task with only title provided | Sets `status: 'Pending'`, `priority: 'Medium'`, generates timestamps | FR-04, FR-08 |
| **UT_13** | `TaskStatus.jsx` | Dynamic status button logic | Task status is `'Pending'` | Card offers "Start" (to In Progress); does not offer current state | FR-08 |
| **UT_14** | `TaskPriority.jsx` | Priority selector options | Inspect priority dropdown | Options exactly match `Low`, `Medium`, `High` | FR-09 |
| **UT_15** | `TaskFilters.jsx` | Filter panel initial state | Render filter bar | Status = All, Priority = All, "Clear filters" disabled | FR-10 |
| **UT_16** | `taskHelpers.js` | Search algorithm matching | Search query `"bug"` against list | Matches title or description case-insensitively; ignores spaces | FR-10, Dev #28 |
| **UT_17** | `taskHelpers.js` | Multi-criteria sort algorithm | Sort by `'priority'` | High priority tasks sorted before Medium, Medium before Low | FR-10, Dev #28 |
| **UT_18** | `profileValidator.js`| Profile email change validation | Change email without `currentPassword` | Rejects with 400 `"Current password is required to change email"` | FR-15, Dev #30 |

---

### 6.2 Integration Test Cases (IT_01 to IT_46 — Selected Updates Highlighted)

| Test ID | Route / Endpoint | Description / Scenario | Expected Response & State | Updated Details / Reason |
|---|---|---|---|---|
| **IT_01** | `POST /api/auth/register` | Register new user with valid body | **201 Created**, `{ message, user }` (**NO token returned**) | **Updated (Dev #12):** Aligns with ST_01 redirect to login. |
| **IT_02** | `POST /api/auth/register` | Register with duplicate email | **409 Conflict**, `{ error, fields: { email } }` | Prevents account overwrite; inline field binding. |
| **IT_03** | `POST /api/auth/register` | Register with NoSQL injection payload | **400 Bad Request**, `{ error: "Invalid input" }` | Type guards reject object parameters. |
| **IT_04** | `POST /api/auth/login` | Valid credentials | **200 OK**, `{ token, user, expiresAt }` | Token signed with HS256, user password omitted. |
| **IT_05** | `POST /api/auth/login` | Wrong password or missing user | **401 Unauthorized**, `"Invalid credentials"` | Constant-time execution; zero email enumeration. |
| **IT_06** | `POST /api/auth/login` | Empty request payload | **400 Bad Request**, `{ fields: { email, password } }` | Validates missing fields. |
| **IT_07** | `POST /api/auth/login` | 11th failed login attempt within 15 mins | **429 Too Many Requests**, rate limit header present | Moved from Sprint 2 to Sprint 1 (Dev #9). |
| **IT_08** | Protected Routes | Request without `Authorization` header | **401 Unauthorized**, `"Authentication required"` | Route guard enforcement. |
| **IT_09** | Protected Routes | Request with malformed Bearer prefix | **401 Unauthorized**, `"Malformed token"` | Header format validation. |
| **IT_10** | Protected Routes | Request with expired JWT token | **401 Unauthorized**, `"Token expired"` | Enforces 24-hour token cutoff. |
| **IT_11** | Protected Routes | Token belonging to deleted user | **401 Unauthorized**, `"User no longer exists"` | Immediate revocation upon user deletion. |
| **IT_12** | `POST /api/tasks` | Create task with valid payload | **201 Created**, `{ message, task }` | Task assigned to authenticated user ID. |
| **IT_17** | `GET /api/tasks` | Fetch task list | **200 OK**, `{ tasks, count, summary }` | **Updated (Dev #29):** Summary includes global totals. |
| **IT_18** | `PUT /api/tasks/:id` | Malformed ObjectId hex string | **400 Bad Request**, `"Invalid task id"` | **Updated (Dev #18):** Returns 400, not 404. |
| **IT_20** | `PUT /api/tasks/:id` | Partial update (title only) | **200 OK**, title updated, other fields unchanged | **Updated (Dev #20):** Supports partial payloads. |
| **IT_23** | `DELETE /api/tasks/:id` | Delete existing user task | **200 OK**, `{ message: "Task deleted", id }` | **Updated (Dev #17):** Returns 200 with body. |
| **IT_27** | `PUT /api/tasks/:id` | Update status to `'In Progress'` | **200 OK**, task status mutated to `'In Progress'` | Validates status progression. |
| **IT_30** | `PUT /api/tasks/:id` | **Attempt to modify another user's task** | **404 Not Found**, `"Task not found"` | **CRITICAL UPDATE (Dev #3, #4):** Changed from 403 to **404** to prevent ID enumeration. |
| **IT_34** | `GET /api/tasks?status=Completed` | Filter tasks by status | **200 OK**, tasks filtered; summary shows all tasks | Server-side status filtering (Dev #27). |
| **IT_35** | `GET /api/tasks?priority=High` | Filter tasks by priority | **200 OK**, tasks filtered; summary shows all tasks | Server-side priority filtering (Dev #27). |
| **IT_36** | `GET /api/tasks?status=x&priority=y` | Combined filters with AND logic | **200 OK**, tasks matching both criteria | Combined server filtering. |
| **IT_38** | `GET /api/tasks/:foreignId` | User A queries User B's task | **404 Not Found**, `"Task not found"` | Cross-tenant isolation verification. |
| **IT_39** | `PUT /api/tasks/:foreignId` | User A updates User B's task | **404 Not Found**, `"Task not found"` | Cross-tenant modification rejection. |
| **IT_40** | `DELETE /api/tasks/:foreignId`| User A deletes User B's task | **404 Not Found**, `"Task not found"` | Cross-tenant deletion rejection. |
| **IT_45** | `POST /api/auth/logout` | User triggers logout endpoint | **200 OK**, confirms client-side token discard | Explicit confirmation (Dev #10). |
| **IT_46** | `PUT /api/auth/me` | Change user email with correct password | **200 OK**, email updated in DB, user returned | Profile management verification (Dev #30). |

---

### 6.3 System & End-to-End Test Cases (ST_01 to ST_40 — Selected Highlights)

| Test ID | User Flow / Feature | Test Procedure | Expected System Behavior |
|---|---|---|---|
| **ST_01** | Registration to Login Redirect | Complete valid registration on UI | Success banner appears; user redirected to `/login` with email prefilled (Dev #12). |
| **ST_04** | Session Survival on Page Refresh | Log in with "Keep me signed in" checked; refresh browser | User remains authenticated on dashboard without returning to login screen (Dev #13). |
| **ST_06** | Inactive Session Expiration | Advance system clock beyond token expiry or receive 401 | App automatically clears storage, displays session-expired notification, redirects to login. |
| **ST_13** | Instant Priority Update on Card | Change priority dropdown from `Medium` to `High` on card | Priority badge instantly updates to red; PUT request dispatched in background. |
| **ST_19** | Dynamic Status Button Workflow | Click "Start" on a Pending task card | Card shifts state to "In Progress"; button swaps to "Complete". |
| **ST_26** | Filter Application & Empty State | Select Status = `Completed` with zero completed tasks | Shows "No tasks match your current filters" and enables "Clear filters" button. |
| **ST_29** | Multi-Browser Data Isolation | Log in as User A in Chrome and User B in Firefox | Neither user can view, edit, or count the other user's tasks. Zero data leakage. |
| **ST_36** | Logout Navigation | Click Logout in top navigation bar | Token discarded from storage, auth context reset to null, immediate redirect to `/login`. |
| **ST_41** | Live Client Search | Type search query into dashboard search input | List instantly narrows matching titles and descriptions without reloading or API calls. |
| **ST_42** | Multi-Criteria Sort | Select "Due Date (Soonest first)" in sort dropdown | List instantly reorders placing earliest due dates at top and undated tasks at bottom. |
| **ST_43** | Profile Name Modification | Open `/profile`, edit Name, click Save | Name updates immediately on profile card and top navigation bar. |
| **ST_44** | Profile Email Change Security | Open `/profile`, edit Email, enter wrong password | Form stays open; shows inline error `"Incorrect current password"`; email unchanged. |

---

## 7. Requirements Traceability Matrix (RTM)

| Requirement | Title / Capability | Unit Tests | Integration Tests | System Tests | Compliance |
|---|---|---|---|---|---|
| **FR-01** | User Registration | UT_01, UT_02, UT_03 | IT_01, IT_02, IT_03 | ST_01, ST_02, ST_03 | **100%** |
| **FR-02** | User Authentication | UT_04, UT_05 | IT_04, IT_05, IT_06, IT_07 | ST_04, ST_05 | **100%** |
| **FR-03** | Token Gating & HS256 | UT_06, UT_07 | IT_08, IT_09, IT_10, IT_11 | ST_06 | **100%** |
| **FR-04** | Create Task | UT_08, UT_09, UT_10, UT_12| IT_12, IT_13, IT_14, IT_15 | ST_07, ST_08, ST_09 | **100%** |
| **FR-05** | View User Tasks | UT_12, UT_16 | IT_16, IT_17 | ST_10, ST_11, ST_12 | **100%** |
| **FR-06** | Edit Task | UT_08, UT_09, UT_10 | IT_18, IT_19, IT_20, IT_21 | ST_13, ST_14, ST_15 | **100%** |
| **FR-07** | Delete Task | UT_12 | IT_23, IT_24, IT_25, IT_26 | ST_16, ST_17, ST_18 | **100%** |
| **FR-08** | Status Workflow | UT_11, UT_13 | IT_27, IT_28, IT_29, IT_30 | ST_19, ST_20, ST_21 | **100%** |
| **FR-09** | Priority Assignment | UT_11, UT_14 | IT_31, IT_32, IT_33 | ST_22, ST_23, ST_24, ST_25 | **100%** |
| **FR-10** | Filter, Search & Sort | UT_15, UT_16, UT_17 | IT_34, IT_35, IT_36, IT_37 | ST_26, ST_27, ST_28, ST_41, ST_42| **100%** |
| **FR-11** | Tenant Data Isolation | UT_12 | IT_30, IT_38, IT_39, IT_40, IT_41| ST_29, ST_30, ST_31 | **100%** |
| **FR-12** | Input Validation & Errors | UT_01, UT_04, UT_08, UT_09| IT_03, IT_06, IT_18, IT_42, IT_43| ST_32, ST_33, ST_34, ST_35 | **100%** |
| **FR-13** | User Logout | UT_06 | IT_45 | ST_36, ST_37, ST_38, ST_39, ST_40 | **100%** |
| **FR-15** | User Profile Management | UT_18 | IT_46 | ST_43, ST_44 | **100%** |
| **SEC-01** | Cryptographic Passwords | UT_03 | IT_01, IT_04 | SEC-01 Validation | **100%** |
| **SEC-02** | Token Security | UT_06, UT_07 | IT_08, IT_09, IT_10 | SEC-02 Validation | **100%** |
| **SEC-03** | Anti-Enumeration & Isolation| UT_08, UT_12 | IT_05, IT_30, IT_38, IT_39 | SEC-03 Validation | **100%** |

---

## 8. Test Schedule and Roles

| Milestone / Phase | Deliverable | Lead Responsible | Status |
|---|---|---|---|
| **Phase A** | Scaffolding, CI pipeline, PR templates | Anirudh Dharane (PM) | Completed |
| **Sprint 1 Testing** | Auth Unit & Integration Tests (UT_01–07, IT_01–11) | Chiranthan HG (QA Lead) | Completed |
| **Sprint 2 Testing** | Task CRUD, Filters, Priority, Status, Isolation | Chiranthan HG (QA Lead) | Completed |
| **Sprint 2 Hardening**| Profile Management, Search/Sort, Security Tests | Akula Sai Nandan Royal (Dev) | Completed |
| **Final Documentation**| Unit, System, Code & Branch Coverage Reports | Chiranthan HG (QA Lead) | Completed |

---

## 9. Approvals and Baseline Sign-off

This updated Software Test Plan v2.0 accurately reflects all technical decisions, architecture evolutions, and test implementations verified at the conclusion of Sprint 2.

| Role | Name | Signature | Date |
|---|---|---|---|
| **QA / Test Lead** | Chiranthan HG | *Chiranthan HG* | November 12, 2026 |
| **Dev Lead** | Akula Sai Nandan Royal | *Akula Sai Nandan Royal* | November 12, 2026 |
| **Project Manager** | Anirudh Dharane | *Anirudh Dharane* | November 12, 2026 |
| **Requirements Lead** | Mohith N | *Mohith N* | November 12, 2026 |

