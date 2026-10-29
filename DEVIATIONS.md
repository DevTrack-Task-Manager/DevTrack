# Deviations and decisions

Everything where the code differs from, or fills a gap in, the SRS, TDD or Test Plan.
Add to this file as you go (build plan, Phase E).

| # | Topic | Source says | What we did | Why |
|---|-------|-------------|-------------|-----|
| 1 | Backend folder | TDD section 6: `server/` | `backend/` | Issue #19 architecture note |
| 2 | Database | TDD section 3: "recommended, confirm" | MongoDB + Mongoose | Issue #9 logged decision |
| 3 | Other user's task | Test Plan IT_30 and section 5.4 allow 403 or 404 | Always **404** | SRS FR-11 is explicit; 404 stops ID enumeration. Update IT_30 to expect 404 |
| 4 | Test Plan IT_30 wording | "403 Forbidden" | see row 3 | Ask QA lead to edit the test case |
| 5 | Default task priority | TDD 3.2 gives none; Issue #6 wants a documented default | `Medium` | Neutral default |
| 6 | Description cap | Issue #4 says "server-side max length" | 1000 characters, title 120 | Reasonable limits, constants in `models/Task.js` |
| 7 | Minimum password length | Test Plan UT_03: min 6 | 6 (bytes capped at 72 for bcrypt) | Follows the Test Plan. Change `PASSWORD_MIN` in `backend/utils/validators.js` and `client/src/utils/validators.js` together to raise it |
| 8 | Error body | `{ "error": "message" }` | Same, plus optional `fields` map on validation errors | Lets the UI show inline errors (FR-12) without parsing text |
| 9 | Login throttling | Test Plan IT_07 sits under Issue #10 | Implemented now (10 failed logins per 15 min per IP, 429) | Cheap to add with auth, covers IT_07 early |
| 10 | Logout endpoint | TDD 4.1 says "invalidate session on client side" | `POST /api/auth/logout` returns 200 and says the token is **not** revoked | Issue #16: never claim revocation without server-side support |
| 11 | `GET /api/tasks` for IT_08 to IT_11 | Tests call `/api/tasks` | Run against `GET /api/auth/me` until Issue #4. Issue #4 adds 401 checks for all four task routes in `tasks.test.js` | Same middleware. `protected.test.js` also asserts on the `/me` body, so it stays on `/me` |
| 12 | Registration response | SRS flow: Register then Login | 201 with the user, **no token** | Matches ST_01 (redirect to login) |
| 13 | Client token storage | TDD 5.2: "memory or secure storage" | localStorage, or sessionStorage when "Keep me signed in" is off | ST_04 needs the session to survive a refresh |
| 14 | `server.js` layout | Plan: server.js holds the setup | `createApp()` is exported from `server.js`; it only listens when run directly | Lets Supertest drive the app without opening a port |
| 15 | Timeline | Full plan | Compressed (see build plan) | Time |
| 16 | Task status and priority values | Some prompts use `todo`, `in_progress`, `completed` and lowercase priorities | TDD 3.2 values: `Pending`, `In Progress`, `Completed` and `Low`, `Medium`, `High` | The model (Issue #9), TDD and Test Plan already use these; changing them would break `taskModel.test.js` |
| 17 | Task response shape | TDD 4.2 does not specify bodies | `GET` -> `{ tasks, count }`; `POST` -> 201 `{ message, task }`; `PUT` -> `{ message, task }`; `DELETE` -> 200 `{ message, id }` | Same style as the auth endpoints. DELETE returns 200 with a body rather than 204 so the client can show a confirmation |
| 18 | Malformed task id | Not specified | `PUT` / `DELETE` with an id that is not a 24 character hex string returns **404** `Task not found`, same as a missing or foreign task | A 400 for bad ids would let a caller tell "bad id" from "someone else's id". Extends row 3 |
| 19 | Description is plain text | Issue #4: "capped plain text" | HTML tags are stripped, control characters removed, newlines kept, 1000 character cap (row 6) | Keeps markup out of the database; React also escapes on output |
| 20 | Partial updates | TDD 4.2: `PUT` "edit an existing task's fields" | `PUT` changes only the fields sent; an empty body is a 400 | Lets the UI and Postman change one field at a time. Unknown fields (including `userId`) are ignored |
| 21 | `?status=` / `?priority=` filters on `GET /api/tasks` | TDD 4.2 lists them | Not in Issue #4; built in Issue #7 | Build plan assigns filtering to Sprint 2 |
| 22 | Route guard file name | Issue #16 mentions `ProtectedRoute.jsx` | `ProtectedRoute` and `GuestRoute` live together in `client/src/components/RouteGuards.jsx` | Already built that way with Issue #3 and imported by `App.jsx`; splitting it would only add churn |
