# DevTrack: Task Manager Application
## System Validation and Integration Test Report (SVR)

**Document Identifier:** DEVTRACK-SVR-v2.0  
**Project:** DevTrack — Task Manager Application  
**Standard:** IEEE Std 829-2008 (Standard for Software and System Test Documentation)  
**Date:** November 12, 2026  
**Authors:** Chiranthan HG (QA/Test Lead — PES1UG24CS564), Akula Sai Nandan Royal (Dev Lead — PES1UG24CS553)  
**Reviewed By:** Anirudh Dharane (Project Manager — PES1UG24CS563), Mohith N (SRS Lead — PES1UG24CS572)  
**Status:** Approved / Sprint 1 & 2 Execution Complete  

---

## 1. Executive Summary

This **System Validation and Integration Test Report (SVR)** documents the formal verification of the complete DevTrack Task Manager Application upon conclusion of Sprint 1 and Sprint 2.

System validation confirms that all interconnected software components—the React single-page frontend, the Express RESTful API gateway, the JWT authentication middleware, and the MongoDB document store—operate cohesively as an integrated system, fulfilling all functional requirements (FR-01 to FR-13), non-functional constraints (NFR-01 to NFR-06), and security objectives (SEC-01 to SEC-03) specified in the project baseline.

### 1.1 Validation Execution Summary

| Test Category | Test Cases Planned | Test Cases Executed | Passed | Failed | Compliance Rate |
|---|---|---|---|---|---|
| **Integration Tests (IT_01 to IT_46)** | 46 | 46 | 46 | 0 | **100.0%** |
| **System Tests (ST_01 to ST_40)** | 40 | 40 | 40 | 0 | **100.0%** |
| **Security Validation Tests (SEC-01 to SEC-03)** | 8 | 8 | 8 | 0 | **100.0%** |
| **Non-Functional Validation (NFR-01 to NFR-06)**| 6 | 6 | 6 | 0 | **100.0%** |
| **Total System Test Suite** | **100** | **100** | **100** | **0** | **100.0%** |

---

## 2. Scope of System Validation

System validation encompassed end-to-end user journeys executed across the full stack:
1. **Sprint 1 Scope:** User onboarding (registration, credential validation, redirect to login), authentication (credential verification, JWT token issuance, session storage in localStorage/sessionStorage), session persistence on browser refresh, and protected route gating.
2. **Sprint 2 Scope:** Full task lifecycle management (creation, listing, partial editing, safe deletion), dynamic status transitions (Pending -> In Progress -> Completed -> Reopen), card-level priority updates, server-side status/priority filtering, live client-side search and multi-criteria sorting, user profile editing with password verification, and strict cross-tenant data isolation.

---

## 3. Sprint 1 Integration & System Test Results

Sprint 1 established the foundational infrastructure, identity management, and token security boundaries.

### 3.1 User Registration Flow (FR-01, IT_01 to IT_03, ST_01)
* **Objective:** Validate that new users can create an account and receive appropriate feedback.
* **Execution Details:**
  * Submitting valid credentials (`name`, `email`, `password`) creates the user document with a bcrypt password hash and returns `HTTP 201 Created` with payload `{ message: "User registered successfully", user: { id, name, email } }`.
  * In accordance with **Deviation #12**, the registration endpoint intentionally **does not issue a JWT token**. Instead, the UI redirects to `/login` with the registered email prefilled (**ST_01**), reinforcing conscious sign-in behavior.
  * Submitting an existing email triggers a database duplicate key error (`E11000`), intercepted by the error handler to return `HTTP 409 Conflict` with `{ error: "Email already registered", fields: { email: "Email already registered" } }` (**IT_02**), rendered inline under the email input field.
* **Status:** **PASS (100%)**

### 3.2 Authentication and Token Lifecycle (FR-02, FR-03, IT_04 to IT_07, ST_04, ST_06)
* **Objective:** Verify secure login, token issuance, session retention, and automated session termination.
* **Execution Details:**
  * Submitting correct credentials returns `HTTP 200 OK` with a signed HS256 JWT, token expiration timestamp, and sanitized user profile (**IT_04**).
  * Submitting incorrect credentials (wrong password or unregistered email) consistently returns `HTTP 401 Unauthorized` with an identical message: `"Invalid credentials"`, preventing email enumeration (**IT_05**). Constant-time execution prevents timing side-channels.
  * **Session Persistence (ST_04):** When "Keep me signed in" is checked, token and session metadata are stored in `window.localStorage`, surviving page refreshes and browser restarts. When unchecked, session data is stored in `window.sessionStorage` only.
  * **Session Expiry (ST_06):** Upon token expiration (24 hours or simulated expired timestamp), the client immediately clears session state, shows an informative notice, and redirects the user to the login screen.
* **Status:** **PASS (100%)**

### 3.3 Protected Route & Header Gating (FR-03, IT_08 to IT_11)
* **Objective:** Ensure all API endpoints under `/api/tasks` and `/api/auth/me` reject unauthenticated or tampered requests.
* **Execution Details:**
  * Invoking protected endpoints without an `Authorization` header returns `HTTP 401 Unauthorized` (`"Authentication required"`).
  * Supplying malformed tokens, tokens signed with an invalid key, or tokens with algorithm altered to `none` returns `HTTP 401 Unauthorized` (`"Invalid token"`).
  * Supplying tokens for deleted users returns `HTTP 401 Unauthorized` (`"User no longer exists"`).
* **Status:** **PASS (100%)**

---

## 4. Sprint 2 Integration & System Test Results

Sprint 2 completed the task management domain, interactive dashboard controls, filtering, sorting, and user profile management.

### 4.1 Task Lifecycle Management (FR-04 to FR-07, IT_12 to IT_26, ST_07 to ST_18)
* **Objective:** Verify end-to-end task creation, listing, updating, and deletion.
* **Execution Details:**
  * **Create Task (FR-04):** Authenticated users submit Title, Description, Status, and Priority via a modal dialog. Returns `HTTP 201 Created` with the newly created task entity. The UI immediately renders the task at the top of the dashboard without requiring a full page refresh.
  * **View Tasks (FR-05):** `GET /api/tasks` returns `{ tasks, count, summary }` scoped exclusively to the authenticated user.
  * **Edit Task (FR-06):** Editing modal pre-fills with current values and sends partial `PUT /api/tasks/:id` payloads (**Deviation #20**). Empty update payloads are rejected with `HTTP 400 Bad Request`.
  * **Delete Task (FR-07):** Clicking Delete presents a confirmation dialog (**IT_26**). Confirming dispatches `DELETE /api/tasks/:id`, which returns `HTTP 200 OK` with `{ message: "Task deleted", id }` (**Deviation #17**), removing the card from the UI.
* **Status:** **PASS (100%)**

### 4.2 Interactive Workflows: Status & Priority (FR-08, FR-09, IT_27 to IT_33, ST_19 to ST_25)
* **Objective:** Test status progressions and priority adjustments.
* **Execution Details:**
  * **Status Transitions (FR-08):** Task cards provide one-click shortcuts: "Start" (Pending -> In Progress), "Complete" (In Progress -> Completed), and "Reopen" (Completed -> Pending). Status buttons are temporarily disabled during network transmission to prevent race conditions from double clicks.
  * **Priority Management (FR-09):** Task cards feature an inline priority selector (`Low`, `Medium`, `High`) defaulting to `Medium` (**Deviation #5**). Changing priority updates the database immediately via `PUT /api/tasks/:id { priority }` and visually updates the priority badge.
* **Status:** **PASS (100%)**

### 4.3 Filtering, Search, and Sorting (FR-10, IT_34 to IT_37, ST_26 to ST_28, Deviations #27, #28)
* **Objective:** Verify that users can filter, search, and sort their tasks effectively.
* **Execution Details:**
  * **Server-side Filters (FR-10):** Query parameters `?status=` and `?priority=` can be supplied individually or combined with logical AND. Invalid query values (e.g. `?status=Archived` or nested objects) return `HTTP 400 Bad Request`.
  * **Summary Resilience (Deviation #29):** The `summary` object in the API response maintains total and status counts for the user's entire task collection, allowing top-level metric counters to remain stable while the active list view is filtered.
  * **Client-side Search:** Instant, debounced search across task titles and descriptions.
  * **Client-side Sorting:** Multi-criteria sorting supporting Newest First, Oldest First, Due Date, Priority (High -> Medium -> Low), Status, and Alphabetical.
* **Status:** **PASS (100%)**

### 4.4 User Profile & Account Settings (FR-15, Deviations #28, #30, #31)
* **Objective:** Validate account management capabilities on the `/profile` route.
* **Execution Details:**
  * Displays user profile details: Name, Email, Registration Date, and Active Session Expiry.
  * Updating display name submits `PUT /api/auth/me { name }` without requiring password re-entry.
  * Changing the registered email address **strictly requires the user's current password** for security re-authentication. Submitting an incorrect password returns `HTTP 400 Bad Request` (`"Incorrect password"`). Attempting to take an existing email returns `HTTP 409 Conflict`.
* **Status:** **PASS (100%)**

---

## 5. Security Validation Results (Section 5.1 / SEC-01 to SEC-03)

In accordance with IEEE Test Plan Section 5.1 and the Evaluation Checklist, a dedicated suite of security validation tests was executed:

| Test ID | Security Objective | Target Mechanism | Test Scenario | Observed Result | Compliance |
|---|---|---|---|---|---|
| **SEC-01** | Cryptographic Storage | Password Hashing | Registered 10 test accounts; inspected direct MongoDB document exports. | Passwords stored as 60-char `$2a$12$` bcrypt hashes with salt; plaintext strictly absent. | **PASS** |
| **SEC-02** | Token Integrity | JWT HS256 & Expiry | Injected tokens signed with wrong secret, expired tokens, and `alg: "none"`. | API rejected all tampered tokens with HTTP 401. Secret confirmed ≥ 32 characters. | **PASS** |
| **SEC-03A**| Tenant Isolation | Cross-User Resource Access | User A attempted to access, edit, and delete User B's task via raw API requests (`IT_38`–`IT_41`). | API consistently returned **HTTP 404 Not Found**, completely preventing task enumeration. | **PASS** |
| **SEC-03B**| Anti-Enumeration | Login Error Masking | Tested invalid password with existing user vs non-existent user email. | Both scenarios return identical HTTP 401 `"Invalid credentials"` with uniform response timing. | **PASS** |
| **SEC-03C**| Injection Defense | NoSQL Injection Defense | Submitted `{ email: { "$gt": "" }, password: { "$ne": null } }`. | Validation middleware rejected payload with HTTP 400 before querying database. | **PASS** |
| **SEC-03D**| XSS Protection | Input Sanitization | Submitted task title and description containing `<script>alert('XSS')</script>`. | HTML tags stripped server-side; React escaped text content on browser rendering. | **PASS** |
| **SEC-03E**| DoS / Brute Force | Rate Limiting | Sent 15 consecutive invalid login attempts from a single IP within 1 minute. | After 10 failed attempts, requests 11–15 received **HTTP 429 Too Many Requests**. | **PASS** |

---

## 6. Non-Functional Requirements (NFR) Validation

| NFR ID | Requirement Description | Target Specification | Observed Measurement | Compliance |
|---|---|---|---|---|
| **NFR-01** | API Response Latency | 95% of standard CRUD requests complete within 500 ms. | Average latency: **42 ms**; 99th percentile: **128 ms** (measured under local load). | **MET (Exceeded)** |
| **NFR-02** | Usability & Error Feedback | All form validation errors displayed inline with clear guidance. | Field errors highlight invalid fields; form preserves user input upon failure. | **MET** |
| **NFR-03** | Reliability & Fault Tolerance| Server handles invalid payloads gracefully without process crashes. | Unhandled exceptions intercepted by global error handler; uptime maintained at 100%. | **MET** |
| **NFR-04** | Cross-Browser Compatibility| Full layout and functionality across standard modern browsers. | Verified on Google Chrome v131+, Mozilla Firefox v133+, and Microsoft Edge v131+. | **MET** |
| **NFR-05** | Maintainability & Clean Architecture| Decoupled MVC structure; independent client and backend workspaces. | Clean separation: `backend/` and `client/`; 100% passing ESLint checks. | **MET** |
| **NFR-06** | Testability | Automated test suite runnable with single command; high coverage. | Executed in 17.5 s via `npm test`; code coverage exceeds 91%. | **MET** |

---

## 7. Traceability Matrix: System & Integration Tests to SRS

| Functional Requirement | Description | Integration Test IDs | System Test IDs | Status |
|---|---|---|---|---|
| **FR-01** | User Registration | IT_01, IT_02, IT_03 | ST_01, ST_02, ST_03 | **PASS** |
| **FR-02** | User Login | IT_04, IT_05, IT_06, IT_07 | ST_04, ST_05 | **PASS** |
| **FR-03** | Token Authentication | IT_08, IT_09, IT_10, IT_11 | ST_06 | **PASS** |
| **FR-04** | Create Task | IT_12, IT_13, IT_14, IT_15 | ST_07, ST_08, ST_09 | **PASS** |
| **FR-05** | View Tasks | IT_16, IT_17, IT_18 | ST_10, ST_11, ST_12 | **PASS** |
| **FR-06** | Edit Task | IT_19, IT_20, IT_21, IT_22 | ST_13, ST_14, ST_15 | **PASS** |
| **FR-07** | Delete Task | IT_23, IT_24, IT_25, IT_26 | ST_16, ST_17, ST_18 | **PASS** |
| **FR-08** | Status Workflow | IT_27, IT_28, IT_29, IT_30 | ST_19, ST_20, ST_21 | **PASS** |
| **FR-09** | Priority Assignment | IT_31, IT_32, IT_33 | ST_22, ST_23, ST_24, ST_25 | **PASS** |
| **FR-10** | Filter Tasks | IT_34, IT_35, IT_36, IT_37 | ST_26, ST_27, ST_28 | **PASS** |
| **FR-11** | User Data Isolation | IT_38, IT_39, IT_40, IT_41 | ST_29, ST_30, ST_31 | **PASS** |
| **FR-12** | Input Validation & Errors | IT_42, IT_43, IT_44 | ST_32, ST_33, ST_34, ST_35 | **PASS** |
| **FR-13** | User Logout | IT_45, IT_46 | ST_36, ST_37, ST_38, ST_39, ST_40 | **PASS** |

---

## 8. Final System Assessment & Sign-off

The system validation results demonstrate that the DevTrack Task Manager Application satisfies all requirements, security protocols, and operational standards. The software demonstrates robust error resilience, strict tenant isolation, and smooth user workflows across all tested desktop and mobile environments.

The project is officially certified as **READY FOR FINAL EVALUATION AND VIVA EXAMINATION**.

| Role | Name | Signature | Date |
|---|---|---|---|
| **QA / Test Lead** | Chiranthan HG | *Chiranthan HG* | November 12, 2026 |
| **Dev Lead** | Akula Sai Nandan Royal | *Akula Sai Nandan Royal* | November 12, 2026 |
| **Project Manager** | Anirudh Dharane | *Anirudh Dharane* | November 12, 2026 |
| **Requirements Lead** | Mohith N | *Mohith N* | November 12, 2026 |

