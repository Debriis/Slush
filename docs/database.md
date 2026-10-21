# Database

Prisma 6 schema lives in backend/prisma/schema.prisma. Migration 202610210001_initial is generated from the schema; 202610210002_access_controls contains Supabase-specific foreign keys, CHECK constraints, RLS grants/policies, and Realtime publication entries. No seeds are provided or executed.

Tables: profiles; connected_accounts; coding_activities; daily_summaries; streaks; clans; clan_memberships; join_requests; follows; posts; likes; comments; challenges; challenge_participations; xp_transactions; achievements; user_achievements; notifications; chat_messages; activity_claims.

Profiles reference real auth.users identities. Child records cascade with profile/clan removal. Activity uniqueness covers (userId, provider, externalId) and (userId, provider, problemId). XP has one unique activityId. Usernames are normalized lowercase and unique. Memberships, follows, likes, join requests and participation have composite unique primary keys. A partial unique index permits one OWNER per clan; backend transactions maintain owner transfer/last-owner leave semantics.

Daily summaries use unique (userId, day) keys. XP is backend-controlled: EASY=10, MEDIUM=25, HARD=50, only after independent verification. Claim status and reviewer audit fields are stored. Canonical problem slugs are lowercased to avoid case-variant duplicate claims. Reviews cannot be self-approved. Achievements are created only on the first actual qualifying event, not via fabricated initial awards.

Indexes cover chronological per-user activity, XP windows, membership lookup, per-clan feed/chat/challenges, follows, notifications and comment pagination. Lists use stable secondary ID ordering and bounded page sizes (1–50). Offset pagination is used; highly active large deployments should migrate to timestamp/ID cursors to avoid shifting pages during concurrent inserts.

All app tables enable RLS. No INSERT/UPDATE/DELETE grants exist for anon/authenticated. Limited authenticated SELECT grants cover posts, clan chat and own notifications for Realtime. Post SELECT permits public posts or current clan membership; chat requires membership even for public clans. No raw evidence URLs, connected accounts or XP writes are exposed directly through Supabase client APIs. The Express backend uses a privileged DB role and enforces authorization on every operation.

Migrations require your own Supabase DB URL and a role with DDL permissions. Run npm run db:migrate; never use db push as a substitute for the security migration. Directly editing leaderboard totals or removing RLS defeats this model. After real credentials were supplied, both migrations were applied and status confirmed up to date. Temporary transactional reads/writes and live policy/index checks passed. No application records were seeded.

Recommended live checks: apply both migrations to a separate Supabase test project; inspect policies and publication; test concurrent duplicate approvals; verify unauthorized direct inserts fail; verify private chat/post SELECT is denied to nonmembers and removed members; test rollback of failed awards and owner transfer; test real bearer-token expiry and password reset. A gated schema/policy/index test exists but cannot replace these behavioral tests.
