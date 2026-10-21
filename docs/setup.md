# Setup

## 1. Install

Open the inner slush monorepo folder. Use Node 22.19+ and npm; run `npm install` (or `npm ci` once the lockfile exists), then `npm run db:generate`. Install new frontend modules from frontend using `npx expo install`; do not install native modules that need a custom development build.

## 2. Supabase project

Create or choose your own Supabase project. No external project has been created by this task. In the Supabase dashboard, obtain the project URL, public publishable/anon key, and PostgreSQL connection strings. Keep database passwords server-side. The backend uses the public key only to verify bearer tokens with Auth; Prisma uses the privileged database connection. No service-role key is needed in the frontend or backend examples.

Run `npm run setup:env` to create missing local files without overwriting existing values. Fill backend/.env locally, then run `npm run config:sync` to copy only validated public Supabase values into frontend/.env. Run `npm run config:check`. Never put private keys in frontend configuration.

Frontend required values:

- EXPO_PUBLIC_SUPABASE_URL: your https://PROJECT.supabase.co URL.
- EXPO_PUBLIC_SUPABASE_ANON_KEY: your public anon/publishable key (never a secret/service-role key).
- EXPO_PUBLIC_API_URL: API address ending in /api. Phone example: http://192.168.1.10:4000/api, substituting your computer's actual LAN IPv4.
- Optional EXPO_PUBLIC_AUTH_REDIRECT_URL: web callback override; leave blank to use the current browser origin plus /reset-password.
- Optional EXPO_PUBLIC_NATIVE_AUTH_REDIRECT_URL: native override; leave blank for the generated Expo Go callback, normally exp://YOUR_LAN_IP:8081/--/reset-password. Allow the actual IP/port in Supabase.

Backend required values:

- DATABASE_URL: your Supabase PostgreSQL connection string. Session pooler connections are suitable for local IPv4; use the exact dashboard connection details. Transaction pooler users should add the appropriate Prisma pgbouncer setting from Supabase guidance.
- DIRECT_URL: a migration-capable direct or session-pooler PostgreSQL connection. Migrations require DDL privileges, and the backend needs a trusted role able to bypass RLS for its authorized operations. Never use the anon/authenticated DB role.
- SUPABASE_URL and SUPABASE_ANON_KEY: same project/public auth configuration.
- CORS_ORIGINS: comma-separated web frontend origins, e.g. http://localhost:8081,http://localhost:8083.
- Optional PORT (4000), NODE_ENV, REVIEWER_USER_IDS (comma-separated trusted reviewer Supabase UUIDs).

Passwords in database URLs must be URL encoded; remove template square brackets around the password. Production uses HTTPS for the API and exact CORS origins; use a proper TLS terminator and separately review proxy/IP rate-limit settings before deployment.

## 3. Apply database and Realtime setup

Run `npm run db:validate`, `npm run db:generate`, and `npm run db:migrate`. These migrations target Supabase PostgreSQL: they reference auth.users, auth.uid(), and authenticated/anon roles. They are not intended for an arbitrary blank PostgreSQL instance.

The second migration enables RLS on all app tables, revokes client writes, adds limited SELECT policies, and adds chat_messages, posts, and notifications to supabase_realtime when that publication exists. In Supabase Database/Replication, confirm these three tables are in the publication and Realtime is enabled. Never disable RLS to make chat work.

## 4. Auth settings

Enable email/password login. Set your Site URL and add the exact redirect URL(s) from above to Auth > URL Configuration. Keep email confirmation enabled. Configure SMTP for reliable production reset/confirmation emails and appropriate provider rate limits. Open confirmation/reset links on the device/browser running the frontend. For Expo Go, the exp:// URL is a local development URL and changes with your LAN IP/port; custom slush:// links are for installed builds and must not be assumed to open Expo Go.

Supabase Auth controls password policy and confirmation. The app additionally requires at least eight characters. Native sessions are stored in chunked Expo SecureStore; web uses browser storage. The app never stores passwords. Email flows and platform links still need verification with your real Supabase settings.

## 5. Run

Terminal one: `npm run backend`. Terminal two: `npm run start --workspace frontend -- --go`. Or `npm run dev` to start both. Web: `npm run web`. Use `ipconfig` to find your active LAN IPv4. Phone and PC must be on the same network, backend binds 0.0.0.0:4000, and your Windows firewall must permit that app/port on the private network. Do not broadly disable the firewall. Test the phone browser's http://YOUR_IP:4000/health/ready. A health success alone does not validate Auth or database migrations.

## 6. First real user

Register, confirm email, sign in. The API provisions the profile only for the verified Supabase identity. New accounts have zero verified solves, zero XP/streaks, no posts, badges, or clans. If a requested username is already taken, a unique identity-derived username is assigned and can be edited.

Create a manual post; confirm no XP changes. Create a clan, then test joins, requests and chat with a second real consenting account. Confirm a nonmember cannot fetch messages or clan posts. Test an authenticated Realtime subscription after removing that user. On reload, session should persist. Test email reset and logout. Registering real QA accounts should be done in a separate Supabase test project, not by seeding fictional production users.

## Evidence reviewers

If you have a legitimate process for independently verifying actual accepted activity, add reviewer UUIDs to backend REVIEWER_USER_IDS and restart the backend. A review queue then appears in those users' profiles. Never approve evidence without verifying ownership, canonical problem, difficulty and original submission time. Reviewers cannot approve themselves. No URL is fetched by the server. Unverifiable claims should be rejected. Do not use unapproved scraping to review evidence. With no reviewers configured, evidence submission clearly reports unavailable.

## Checks

`npm test`, `npm run lint`, `npm run typecheck --workspace frontend`, `npm run check:dependencies`, `npm run doctor --workspace frontend`. Database policy/index checks run only with TEST_DATABASE_URL pointing to an explicitly disposable, migrated Supabase test project. No live database tests run without it. Migration status: `npm run db:status --workspace backend`.

## Development troubleshooting

`npm run dev` keeps Expo running when backend configuration is incomplete and lists missing variable names. Saving backend/.env retries the backend. Ctrl+C stops its own child processes. Restart Expo after changing frontend public configuration.

The LAN address during verification was 192.168.1.13; check again after network changes. Default Metro port is 8081; verification used 8085. Add the actual browser origin to CORS_ORIGINS and exact reset callbacks to Supabase Auth URL Configuration. Phones use the LAN API URL, never localhost.

`npm run services:check` verifies database connectivity, temporary transactional reads/writes, and Auth availability without creating application records. Anonymous protected API requests should return 401. If Expo Starter appears, run from the inner monorepo folder and open the port printed by the current Expo process.

## Google sign-in

The login and registration screens include Continue with Google, using Supabase OAuth and the existing session/profile provisioning. No Google client secret belongs in frontend/.env and no extra dependency is required.

1. In Google Cloud Console, configure the OAuth consent screen (Google Auth Platform), then create a Web application OAuth client. For a testing consent screen, add your real test accounts.
2. Set the authorized JavaScript origin to the actual web origin (currently http://localhost:8085; default development port is 8081).
3. Set Google's authorized redirect URI to https://vumicqseqzzqolgmcfok.supabase.co/auth/v1/callback for this project. For another project, copy its callback from Supabase's Google provider panel.
4. In Supabase Dashboard > Authentication > Sign In / Providers > Google, enable Google and save the Web client ID and client secret there. Keep the secret only in the provider dashboard.
5. In Supabase Auth > URL Configuration, allow the app callback: http://localhost:8085/reset-password (or the actual browser origin/port). Google redirects to Supabase first; Supabase redirects to the app. These are different URLs.
6. Click Continue with Google and complete login with a real account; verify that the dashboard opens and the session persists after reload.

Google OAuth is unavailable inside Expo Go because it cannot customize the app scheme. The app explains this and retains email sign-in. Browser-session handling is implemented for installed builds with an allowed app callback; device OAuth is unverified. No development build was created or required for existing Expo Go features.

References: https://supabase.com/docs/guides/auth/social-login/auth-google and https://docs.expo.dev/guides/authentication/.

If sign-in stalls at Opening your workspace and /api/me times out, check whether the computer's LAN IPv4 changed. Update EXPO_PUBLIC_API_URL for physical phones and restart Metro after editing frontend/.env. Localhost web sessions automatically use loopback for an HTTP API configured on a private LAN address; deployed HTTPS APIs remain unchanged. EXPO_PUBLIC_WEB_API_URL optionally overrides the web address. The profile bootstrap runs even when the browser reports offline, so a failed request can time out and offer Retry rather than remain paused.

### Registration returns 429

HTTP 429 from Supabase Auth means the authentication provider is rate-limiting the request, not a database connection failure. Stop repeatedly submitting. Check for an earlier confirmation email and inspect Supabase Authentication logs for the error code. `over_email_send_rate_limit` indicates an email quota; configure a real custom SMTP provider in Supabase Auth email settings for production delivery. A generic 429 can also be an endpoint/IP limit. Do not disable email confirmation to work around it. The app shows safe rate-limit messages and a 60-second local retry delay; this delay does not guarantee the server quota has reset.
