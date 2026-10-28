## Summary
<!-- What does this PR change, and why? Keep it to a few lines. -->

## Linked issue
Closes #<!-- issue number -->

<!-- Not on the board (e.g. CI, scaffolding)? Reference the assignment item instead, e.g. "Deliverable 2b". -->

## Requirement mapping
| SRS ID | Test cases run (UT / IT / ST IDs) |
| --- | --- |
| FR-__ / SEC-__ / NFR-__ | |

## Acceptance criteria
<!-- Copy the checklist from the issue and tick each one. -->
- [ ] 
- [ ] 

## Testing checklist
- [ ] `npm run lint` passes in `backend/` and `client/`
- [ ] `npm test` passes in `backend/` and `client/`
- [ ] Endpoints exercised in Postman, UI exercised in a browser
- [ ] Test cases listed in the issue header were run
- [ ] CI is green

## Security and AI-generated code review
- [ ] No hard-coded secrets, tokens or real `.env` values in the diff
- [ ] Every protected route uses the auth middleware
- [ ] Another user's resource returns **404**, not 403 (FR-11)
- [ ] Error responses are `{ "error": "..." }` with no stack traces
- [ ] bcrypt rounds >= 10, JWT is HS256 with a 24h expiry (SEC-01, SEC-02)
- [ ] I recognise every new dependency in `package.json`
- [ ] I read the whole diff, not just the summary

## Screenshots / notes
<!-- UI changes: add before and after. Anything reviewers should know. -->
