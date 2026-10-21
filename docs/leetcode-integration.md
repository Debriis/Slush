# LeetCode integration

Implemented in the existing Slush monorepo. Automatic collection is disabled; this is a user-controlled import integration.

## Access review (2026-10-21)

LeetCode terms https://leetcode.com/terms/ prohibit crawling, scraping and spidering. Reviewed the official help center https://support.leetcode.com/hc/en-us and searched for documented third-party integration options; no documented authorized public activity API was found. Publicly reachable or undocumented GraphQL endpoints are not permission. No calls are made to LeetCode, and no passwords, cookies, CAPTCHA bypasses or proxy workarounds are used. Automatic sync requires explicit LeetCode authorization and documented access scope, credentials, ownership verification, rate limits and retry rules before implementing an adapter. The client and sync/job interfaces fail closed; no scheduled job runs.

## Endpoints (Supabase Bearer token required)

- GET /api/leetcode — connection, capabilities, personal statistics, daily submission calendar and latest 50 imported submissions.
- PUT /api/leetcode/account — strict {username}; saves a self-reported connection, never verifies ownership.
- DELETE /api/leetcode/account — disconnects and retains personal import history.
- POST /api/leetcode/import/preview — validates and returns new/duplicate counts plus first 20 new rows; writes nothing.
- POST /api/leetcode/import — validates the file again, recomputes duplicates under a user lock and commits atomically.
- POST /api/leetcode/sync — 409, automatic access unavailable.

Legacy /api/me/accounts/leetcode writes use the same connection controller. LeetCode endpoints allow 20 requests per authenticated user per minute. Upload body limit is 1 MB; content is limited to 500,000 characters and 1,000 records. Other routes retain their existing 32 KB body limit. No userId or verification fields are accepted from a client. Errors use the existing API envelope. Failed imports roll back; retrying an import is safe because duplicates are skipped. No automatic provider retries occur because no provider access is enabled.

## File contract

Use a file you prepared yourself or legitimately obtained. This is a Slush import format, not a claim that LeetCode offers an export. CSV header (any order):

```csv
externalId,problemId,title,difficulty,occurredAt,status
```

JSON is an array of objects containing exactly those same six fields. Identifiers and titles must be nonempty strings; difficulty is EASY, MEDIUM or HARD; status must be ACCEPTED; occurredAt must be a past ISO 8601 timestamp containing Z or an explicit timezone offset. No source code, credentials or extra fields are accepted. CSV supports quoted commas, escaped quotes and embedded newlines. Invalid files are rejected as a whole. Repeated external IDs within a file and in storage are duplicates. Existing records are never overwritten.

Personal solved totals count distinct problem IDs. Calendar cells count accepted submissions, so repeated submissions can increase daily counts without increasing solved totals. Dates and personal streaks use the Slush profile IANA timezone, including DST. Current streak includes yesterday when today is empty. Statistics cover all retained imports, including previous connected usernames, and never claim to be lifetime platform totals. Each recent submission retains its imported username. Disconnect does not erase history. Sync and import timestamps are distinct.

## Storage and competitive isolation

Migration: backend/prisma/migrations/202610210003_leetcode_import/migration.sql (additive, applied successfully).

ConnectedAccount gains status, lastImportedAt, lastSyncAt and syncStatus. ImportedSubmission stores username, platform, submission/problem identifiers, title, difficulty, timestamp and SELF_REPORTED_IMPORT source. The table has RLS with no client-access policies, a user/time index and a unique user/provider/externalId index. All access goes through authenticated Express handlers. Imports are separate from CodingActivity, DailySummary, Streak and XpTransaction; they cannot award competitive XP, clan scores, challenge progress, verified achievements or leaderboard points. Existing verified data is unchanged.

## Frontend

Protected Expo Router route /leetcode uses the existing dark UI. Includes username save, connection status, disconnect, document picker, preview, confirmation, duplicate counts, personal totals/difficulty breakdown, heatmap, personal current/longest streaks, recent submissions, sync/import timestamps, loading/error/empty states and explicit self-reported labels. Sync button appears only if supported (currently false). Home, profile and activity screens link to personal statistics. A user can share an imported submission as a labeled manual social post with no XP; sharing is never automatic. Existing verified heatmaps and competitive stats remain separately labeled.

## Files

Created:
- backend/src/integrations/leetcode/{leetcodeClient,leetcodeService,leetcodeNormalizer,leetcodeSync}.js
- backend/src/controllers/leetcodeController.js
- backend/src/routes/leetcodeRoutes.js
- backend/src/jobs/codingActivitySync.js
- backend/prisma/migrations/202610210003_leetcode_import/migration.sql
- backend/tests/leetcode.test.js
- frontend/src/features/activity/activityCalendar.js
- frontend/__tests__/activityCalendar.test.js
- frontend/app/leetcode.jsx
- frontend/src/features/leetcode/LeetCodeScreen.jsx
- docs/leetcode-integration.md

Modified:
- backend/prisma/schema.prisma
- backend/src/app.js
- backend/src/routes/users.js
- frontend/app/_layout.jsx
- frontend/src/features/{home/HomeScreen,profile/ProfileScreen,activity/ActivityScreen,activity/ActivityCharts}.jsx
- frontend/package.json and package-lock.json (Expo-compatible document picker/file system dependencies)

## Verification and limits

npm test: 73 passed, 1 skipped (existing disposable database integration test requires TEST_DATABASE_URL). Six new LeetCode tests cover strict validation, CSV parsing, timestamp/zone boundaries, streaks, connection lifecycle, unavailable sync, previews, duplicate persistence via isolated test doubles, authenticated HTTP requests and per-user rate limits. Initial sandbox HTTP tests failed due to loopback EACCES; rerun with loopback access passed.

Lint, frontend typechecking and Expo web export passed. Two frontend heatmap tests cover local date/year boundaries, complete 13-week grids, empty cells and DST. Prisma generate and validate passed. Migration applied to configured Supabase PostgreSQL. Live read-only queries verified the new table, RLS, unique index and Prisma reads. No real user activity was supplied or imported, so real submission correctness and device picker interaction are not claimed as verified. No fixture records were inserted in production. Import persistence is covered by test doubles; a full write/read integration test should run against a disposable Supabase test project. No approved automatic integration exists, so platform lifetime statistics and ownership verification are unavailable.

## Run (PowerShell from repository root)

```powershell
cd C:\Users\Ayush\OneDrive\Documents\testing\slush\slush
npm install
npm run config:check
npm run db:generate
npm run db:migrate
npm run dev
```

Existing backend/.env and frontend/.env must contain the configured database/Supabase/API values (see their .env.example files). For separate terminals use `npm run backend` and `npm run frontend`; for browser development use `npm run web`. Open Profile → LeetCode activity and imports. Native builds need the newly added Expo modules included; regenerate a development build if your existing binary does not include them.

Checks:

```powershell
npm test
npm run lint
npm run typecheck --workspace frontend
npm run db:validate
```
