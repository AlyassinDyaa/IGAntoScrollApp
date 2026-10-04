# IG Focus Hub - project conventions

Read this before doing anything in this repository.

## Non-negotiable workflow rules

1. **Never commit or push without the owner's explicit go-ahead.** Prepare the change,
   run the checks, show the proposed commit message, then wait. "Green-lit" means the
   owner (Dyaa Alyassin) said yes in this conversation for this specific commit/push.
2. **No AI attribution anywhere.** Do not add `Co-Authored-By`, `Claude-Session`,
   "Generated with", model names, or any assistant mention to commit messages, PR titles,
   PR bodies, code comments, docs, or file headers. Git identity is the owner's:
   `Dyaa Alyassin <116694435+AlyassinDyaa@users.noreply.github.com>` (set per-repo).
3. **Anti-doomscrolling rules are product requirements** (see `docs/PRODUCT_RULES.md`).
   No home feed, no Explore, no Reel browser, no swipe-next, no recommendations,
   finite lists, action-first home, exit after task. Do not add any of these, even as a
   "nice to have".
4. **Be honest about Meta limits.** Anything that depends on Meta approval, region,
   licensing or API availability is labelled as such in the UI and in docs. Never promise
   the full Instagram music catalog.

## Stack

- Language: **TypeScript everywhere** (strict). Node 22, pnpm workspaces.
- `apps/web`: Next.js (App Router) PWA, Tailwind v4, lucide-react icons.
- `apps/api`: Fastify 5, zod, Prisma (PostgreSQL), BullMQ (Redis), web-push.
- `packages/shared`: zod schemas/types, feature matrix, design tokens.
- `packages/meta`: Graph API client (OAuth, messaging, publishing, audio, insights, webhooks).
- `packages/db`: Prisma schema + AES-256-GCM token encryption.

## Design system

The UI must look and feel like Instagram, **in dark mode by default** (black background,
`#fafafa` text). The product ships as an installable PWA (Add to Home Screen), never via an
app store. Tokens live in `apps/web/app/globals.css` and
`packages/shared/src/design-tokens.ts` (system font stack, `#262626` text, `#8e8e8e`
secondary, `#dbdbdb` separators, `#0095f6` primary, IG gradient for rings/brand, 50px
bottom tab bar, 44px top bar, 8px card radius, pill chips). See `docs/DESIGN_SYSTEM.md`.

## Commands

```
pnpm install
pnpm dev            # web on :3000, api on :4000 (MOCK_META=1 needs no services)
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate / pnpm db:migrate   # real mode only
```

## Testing expectations

Run `pnpm typecheck && pnpm test` before proposing a commit. Add a test when touching
`packages/meta`, `packages/db`, or API routes.
