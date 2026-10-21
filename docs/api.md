# API reference

Base URL: http://YOUR_LAN_IP:4000/api for local Expo Go. All /api routes require Authorization: Bearer <Supabase access token>. Supabase Auth owns registration/login/email confirmation/reset; passwords are never sent to Express. Backend verifies tokens with Supabase getUser, with a ten-second provider timeout. Supabase Auth availability is required for protected calls.

Success: {data: ...}. Lists: {data:{items:[],nextPage:null|number}}. Error: {error:{message,fields?}}. Page starts at 1; limit is 1–50, default 20. Validation rejects unexpected mutation fields. Missing/expired identity returns 401, authorization 403, missing record 404, conflict 409, and unavailable review/auth/db service 503. No XP/streak/verified mutation endpoint is public.

## Health

- GET /health: process health, no database assertion.
- GET /health/ready: live database query; no auth, exposes no database details.

## Profile, connections and activity

- POST /me: provision the authenticated profile. Body: optional username, timeZone. Safe repeated calls never overwrite an existing profile. Uses a unique identity-derived default if a requested username collides.
- GET /me: own profile, accounts, isReviewer derived from server configuration.
- PATCH /me: username, bio, avatarUrl (HTTPS or empty), timeZone (valid IANA; locked after first verified activity).
- GET /users?search=: paginated public directory.
- GET /users/:id: public profile, social counts, following status, earned badges and real stats.
- GET /users/:id/stats: current/longest streak, XP, level/progress, verified solve count and daily summaries (last 366 days).
- PUT or DELETE /users/:id/follow: follow/unfollow, no self-follow. Mutual follows are friends.
- GET /me/connections?kind=following|followers|friends: paginated public profiles.
- GET /activity?userId=: paginated verified problems. Defaults to current user.
- GET /me/xp: own paginated XP history and source activity.
- GET /platforms: honest connector capability status, not simulated submissions.
- PUT /me/accounts/:provider: body {username}; saves self-reported leetcode/codeforces/github name, resets any ownership flag, awards nothing.
- DELETE /me/accounts/:provider: remove self-reported name.

## Feed

- GET /posts?scope=global|following|mine|clan&clanId=: paginated posts, author, verified achievement attachment, counts and own like status. Clan scope requires current membership; other scopes exclude clan posts.
- POST /posts: {body,clanId?,activityId?}. Manual kind is server-selected by default; a verified achievement attachment must belong to the authenticated author.
- DELETE /posts/:id: own posts only.
- PUT or DELETE /posts/:id/like: idempotent like/unlike; private post access checked.
- GET /posts/:id/comments: paginated authorized comments.
- POST /posts/:id/comments: {body}, max 1000 chars; author notification if appropriate.
- DELETE /comments/:id: own comment only.

## Clans

- GET /clans?search=&mine=true|false: paginated discoverable metadata; private content stays protected.
- POST /clans: {name,description?,private?}; atomically creates OWNER membership.
- GET /clans/:id: clan metadata and own membership; private details require membership.
- PATCH /clans/:id: owner/admin can edit name/description/privacy.
- POST /clans/:id/join: public clan creates membership; private clan creates join request.
- DELETE /clans/:id/membership: leave. Owner must transfer first, or, if sole member, leaving deletes the clan.
- GET /clans/:id/members: paginated member profiles, current members only.
- PATCH /clans/:id/members/:userId: owner only, body {role:ADMIN|MEMBER|OWNER}. OWNER transfers ownership and demotes old owner to ADMIN in the same transaction.
- DELETE /clans/:id/members/:userId: owner/admin with hierarchy checks. Owner cannot be removed.
- GET /clans/:id/requests: paginated owner/admin review queue.
- POST /clans/:id/requests/:userId: {approve:boolean}; owner/admin, notification to requester.
- GET/POST /clans/:id/messages: paginated newest-first messages / {body}; current membership required. Frontend subscribes to authorized Supabase inserts and fetches API records.
- GET /clans/:id/challenges: paginated challenges, own participation, progress from verified activity since max(challenge start, joining).
- POST /clans/:id/challenges: owner/admin {title,target,startsAt,endsAt}; future valid ISO window. UI creates seven-day challenges; API supports explicit windows.
- POST /challenges/:id/join: current clan members only, rejects ended challenges.

## Rankings and notifications

- GET /leaderboards?scope=global|friends|clan&period=week|month|all&metric=xp|solved&clanId=: paginated SQL RANK results. Ties share rank; stable username/ID secondary order. Friends scope includes self and followed users. Clan scope requires membership; scores include only verified activity since each current member joined. UTC week begins Monday. No periodic reset writes are necessary.
- GET /notifications: own paginated notifications.
- PATCH /notifications/:id: mark own notification read.

## Legitimate evidence review

- POST /activity/claims: {provider,problemId,title,difficulty:EASY|MEDIUM|HARD,occurredAt:ISO_UTC,evidenceUrl:https}. No XP input accepted. Reviewer configuration is required; otherwise 503 with explicit unavailable message. Canonical slugs are normalized lowercase. Never include cookies/passwords/access tokens in evidence URLs.
- GET /activity/claims: own claims/status, paginated.
- GET /admin/claims: pending queue, only server-configured reviewer UUIDs.
- POST /admin/claims/:id/review: {approve:boolean}, configured independent reviewers only, no self-review or repeat review. A reviewer must verify actual acceptance, account ownership, canonical difficulty/problem, and original time through permitted evidence before approval. Approval atomically creates unique activity and product XP; duplicate accepted problems fail with conflict and rollback.

No automatic LeetCode API integration is enabled. No undocumented endpoint is called, no scraping is performed, and username storage proves no ownership. Sources investigated: https://leetcode.com/terms/ and official LeetCode discussion about public submitted-code APIs. A future adapter must have authorized access, ownership verification, timeouts/rate limits and deterministic IDs before being registered.
