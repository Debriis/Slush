# Setup verification — 2026-10-21

Real credentials were supplied locally. No secrets are recorded here and no fake accounts or activity were created.

Executed checks:

- PostgreSQL connection and temporary transactional insert/read: passed.
- Both Prisma migrations applied; migration status up to date.
- Supabase Auth reachable; email provider enabled.
- API readiness via localhost and LAN: HTTP 200.
- Anonymous protected API and direct XP-table access denied (401).
- Live database policy/index definition test passed.
- Regression suite including live database check: 51 passed, zero failed/skipped (6 setup/process, 33 backend, 12 frontend).
- Browser sign-in page, empty-form validation, registration/reset navigation checked; final captured console clean.

Email delivery, authenticated session/social/clan workflows, Realtime revocation, and physical Android Expo Go require real-account/device testing. Schema checks do not substitute for these behavioral checks. Automated API tests use isolated test doubles, never seeded production records.

Final lint, JavaScript checking, formatting, git diff whitespace check, dependency compatibility, Expo Doctor (20/20), and Expo export for Android/iOS/web passed. Installation reported 27 audit findings through tooling chains (19 high, 8 moderate); incompatible forced upgrades were not applied. Automatic LeetCode sync remains unavailable; unverified activity earns no XP.

Google authentication addition: login/register buttons and Supabase OAuth browser flow implemented. Frontend tests: 18/18 passed (including six OAuth tests); root lint and frontend JS checks passed. The live Supabase settings endpoint confirmed Google is disabled. End-to-end Google authentication cannot run until a Google Web OAuth client is configured in Supabase. Expo Go explicitly retains email authentication because OAuth needs an app-specific scheme.
