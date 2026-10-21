# SLUSH — Strava for Coders

A JavaScript/JSX Expo SDK 58 mobile app with a separate Express API, Supabase Auth, PostgreSQL/Prisma, and Supabase Realtime. There are no seeded users, sample submissions, fabricated stats, or hardcoded leaderboards.

## What is implemented

- Register, email confirmation, login, persistent sessions, logout, password reset, protected navigation, profile provisioning and editing.
- Database-backed dashboard: verified solves, current/longest streaks, heatmap, seven-day chart, XP and levels.
- Community/following/personal feeds, manual posts (explicitly no XP), verified achievement sharing, likes, comments, pagination and refresh.
- Public/private clans, owner/admin/member roles, join requests, approval, ownership transfer, removal, leave, member directory, feed, chat, and seven-day challenges.
- Global/following/clan rankings, UTC week/month/all-time windows, XP/verified-solve metrics and tied ranks.
- Profile pictures by HTTPS URL, bios, follower/following/mutual-friend lists, first-verified achievement and notifications.
- Independent activity evidence review, atomic backend XP transactions and duplicate prevention. No automatic LeetCode scraping or undocumented API access.

The configured Supabase database is connected and both migrations are applied. Temporary database reads/writes, anonymous-access protection, and the real sign-in page were checked. Email delivery, authenticated workflows, Realtime behavior, and physical-device operation still need real-account testing.

## Project

```text
slush/                         # Git/monorepo root (the inner slush folder)
  frontend/
    app/                       # (auth), (tabs), clans/[id], users/[id], notifications
    src/
      components/              # reusable dark/purple UI
      features/                # auth, home, activity, clans, leaderboard, profile, notifications
      hooks/                   # Query hooks and cleaned-up Realtime subscription
      services/                # Supabase, secure session storage, HTTP transport
      store/                   # Zustand UI preferences only
      config/                  # validated public environment
      theme/
    assets/                    # preserved original app assets
    legacy-src/                # preserved starter source, not routed or bundled
    __tests__/
    .env.example
    package.json
  backend/
    src/                       # app/server, routes, controllers, services, middleware, validators, utils
    prisma/                    # schema and two migrations, including RLS policies
    tests/                     # unit/API tests, optional live DB definition checks
    .env.example
    package.json
  docs/
  scripts/dev.js
  package.json
```

## Windows PowerShell quick start

```powershell
cd C:\Users\Ayush\OneDrive\Documents\testing\slush\slush
npm install
npm run setup:env
# Preserves existing local files. For a new installation, fill backend/.env locally.
npm run config:sync
npm run config:check
npm run db:generate
npm run db:validate
npm run db:migrate
# Two terminals:
npm run backend
npm run frontend -- --go
# Or start both:
npm run dev
```

For Expo Go, forward arguments with `npm run start --workspace frontend -- --go` (the explicit direct workspace command). For web: `npm run web`. On a phone the API URL must use your computer's LAN IP, not localhost.

```powershell
npm test
npm run lint
npm run typecheck --workspace frontend
npm run check:dependencies
npm run doctor --workspace frontend
```

See [setup](docs/setup.md) for exact Supabase/redirect/LAN configuration, [database](docs/database.md), [API](docs/api.md), [architecture](docs/architecture.md), and [verification](docs/verification.md).

Automatic LeetCode sync is unavailable. An account username is self-reported, not proof of ownership. Manual posts never earn competitive points. Evidence review stays disabled unless trusted reviewer UUIDs are configured; independent reviewers must verify genuine ownership/acceptance and may not approve themselves. Only approved unique problems earn the initial SLUSH product XP rules (10/25/50), which are not LeetCode scores.
