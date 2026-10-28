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
| 11 | `GET /api/tasks` for IT_08 to IT_11 | Tests call `/api/tasks` | Run against `GET /api/auth/me` until Issue #4 | Same middleware; re-point the tests when tasks land |
| 12 | Registration response | SRS flow: Register then Login | 201 with the user, **no token** | Matches ST_01 (redirect to login) |
| 13 | Client token storage | TDD 5.2: "memory or secure storage" | localStorage, or sessionStorage when "Keep me signed in" is off | ST_04 needs the session to survive a refresh |
| 14 | `server.js` layout | Plan: server.js holds the setup | `createApp()` is exported from `server.js`; it only listens when run directly | Lets Supertest drive the app without opening a port |
| 15 | Timeline | Full plan | Compressed (see build plan) | Time |
