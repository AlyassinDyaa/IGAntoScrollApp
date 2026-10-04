# IG Focus Hub

**Instagram without the doomscrolling.** A focused companion app for people who need
Instagram for messaging and business but not the feed. One hub controls up to three
professional Instagram accounts: unified inbox, publishing (posts, Reels, carousels),
scheduling, comments, insights and push notifications. No home feed, no Explore, no
Reel browsing.

Full product specification: [`docs/IG_Focus_Hub_Product_Spec.pdf`](docs/IG_Focus_Hub_Product_Spec.pdf).

**Distribution:** an installable PWA. Open it in Safari or Chrome and use *Add to Home
Screen*. There is no App Store or Play Store release. Dark mode is the default theme.

## What's in the box

| Area | Status |
| --- | --- |
| Unified 3-account inbox, reply safety, reactions, labels, notes, saved replies | Built (mock + Graph) |
| Sent-Reels-only viewer (no swipe-next) | Built |
| Create studio: upload, trim, crop/rotate, text, cover, volume, caption, tags, location | Built (UI + draft model) |
| Instagram Audio API search/select, rename original audio | Built (behind Facebook Login) |
| Publish now / schedule, carousels, share Reel to feed | Built |
| Business dashboard, comments hub, content library | Built |
| Web Push with quiet hours, priority contacts, per-account rules, deep links | Built |
| Facebook Login (Instagram Platform) OAuth, encrypted tokens, webhooks | Built, needs Meta app review |
| Server-side video rendering (burn text, apply trim/crop/mix audio) | Phase 2 |

See [`docs/FEATURE_MATRIX.md`](docs/FEATURE_MATRIX.md) for what depends on Meta.

## Stack

TypeScript monorepo (pnpm workspaces):

```
apps/web        Next.js PWA (iPhone Safari + desktop), Tailwind v4, Instagram design tokens
apps/api        Fastify API: OAuth, inbox, publishing, audio, webhooks, push, scheduler
packages/shared zod schemas, types, feature matrix, design tokens
packages/meta   Meta Graph API client
packages/db     Prisma schema (PostgreSQL) + token encryption
```

## Quick start (no Meta credentials needed)

```bash
# Windows: clone into E:\projects
cd /d E:\projects
git clone https://github.com/AlyassinDyaa/IGAntoScrollApp.git
cd IGAntoScrollApp

corepack enable            # gives you pnpm 10
pnpm install
copy .env.example .env     # MOCK_META=1 is already set
pnpm dev
```

- Web: http://localhost:3000 (opens on Inbox, as designed)
- API: http://localhost:4000/health

In mock mode the API serves fixture data for three demo accounts so every screen is
usable before Meta approves the app.

## Going live with Meta

1. Create a Meta app (Business type) and add **Instagram** → *API setup with Facebook login*.
2. Link each professional Instagram account to its own Facebook Page.
3. Fill `META_*`, `DATABASE_URL`, `REDIS_URL`, `TOKEN_ENCRYPTION_KEY`, `SESSION_SECRET`
   and VAPID keys in `.env`, set `MOCK_META=0`.
4. `docker compose up -d` (Postgres + Redis), then `pnpm db:migrate`.
5. Start `pnpm dev` and, in production, `pnpm --filter @ig-focus-hub/api worker`.

Step-by-step: [`docs/META_SETUP.md`](docs/META_SETUP.md).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Web + API with hot reload |
| `pnpm typecheck` | Strict TypeScript across all packages |
| `pnpm test` | Vitest (API integration tests run against mock mode) |
| `pnpm build` | Production builds |
| `pnpm db:migrate` | Prisma migrations (real mode) |

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) – how the pieces fit, data flow, security
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) – Instagram-matching tokens and components
- [`docs/CREATE_STUDIO.md`](docs/CREATE_STUDIO.md) – the creation experience, tool by tool
- [`docs/PRODUCT_RULES.md`](docs/PRODUCT_RULES.md) – anti-doomscrolling rules
- [`docs/DEPLOY.md`](docs/DEPLOY.md) – host on Vercel + Railway and test on your phone
- [`docs/ROADMAP.md`](docs/ROADMAP.md) – phases and what's next
