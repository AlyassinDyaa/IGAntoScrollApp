# Architecture

```
┌──────────────────┐   ┌──────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│ Your 3 IG        │   │ Meta Platform    │   │ IG Focus Hub API    │   │ PWA (iPhone +    │
│ professional     │◄──│ Facebook Login   │◄──│ Fastify / Node 22   │◄──│ desktop)         │
│ accounts, each   │   │ Messaging        │   │ Prisma + Postgres   │   │ Inbox · Create · │
│ linked to a Page │   │ Publishing       │   │ BullMQ + Redis      │   │ Business ·       │
│                  │   │ Audio API        │──►│ Web Push (VAPID)    │──►│ Content ·        │
│                  │   │ Webhooks         │   │ Media storage       │   │ Settings         │
└──────────────────┘   └──────────────────┘   └─────────────────────┘   └──────────────────┘
```

## Why Facebook Login instead of Instagram Login

Instagram Login is simpler, but the 2026 Instagram Audio API is only exposed through the
Facebook Login flavour of the Instagram Platform. Because selecting supported audio for
Reels matters for this product, the whole app is built around Facebook Login. Each
professional Instagram account must be linked to a Facebook Page:

```
IG Account 1 → FB Page 1
IG Account 2 → FB Page 2     ──►  one hub, three page tokens
IG Account 3 → FB Page 3
```

Code: `packages/meta/src/oauth.ts` (`buildLoginUrl`, `exchangeCode`, `toLongLivedToken`,
`listLinkedInstagramAccounts`) and `apps/api/src/routes/meta-oauth.ts`.

## Request flow

1. The PWA calls the API with a signed, httpOnly session cookie (`igfh_session`).
2. Routes resolve an owner-scoped `Store` (Postgres via Prisma) and a `MetaGateway`
   (Graph API). With `MOCK_META=1` both are swapped for in-memory fixtures so the UI
   runs with zero services.
3. The gateway decrypts the account's page token (AES-256-GCM, key from
   `TOKEN_ENCRYPTION_KEY`) only for the duration of the call.

## Inbox

- `GET /inbox/conversations` returns a finite, paginated list (max 100) across all accounts
  with per-account filtering and search.
- `POST /inbox/sync` pulls one page of threads per account from
  `/{page-id}/conversations?platform=instagram` and mirrors them locally, keeping local
  flags (favorite, labels, priority, notes).
- Reply safety: `POST /inbox/messages` rejects a send if the conversation belongs to a
  different account than the one in the request, and echoes `sentAs` so the UI confirms
  which account replied.
- Reactions use the `sender_action: react | unreact` payload on `/{ig-user-id}/messages`.

## Sent-Reels-only viewer

A Reel shared in a DM arrives as a `shares` entry with an Instagram permalink. The
viewer (`apps/web/app/reel/[id]`) plays the direct media URL when Meta exposes one and
otherwise opens the exact permalink in a new tab, then returns to the DM. There is no
next/previous, no related content.

## Publishing

`GraphGateway.publish()` implements the container flow:

- Image: `POST /{ig-user-id}/media { image_url }` → `media_publish`.
- Reel: `POST /media { media_type: REELS, video_url, cover_url|thumb_offset, share_to_feed,
  audio_id, audio_name }` → poll `status_code` until `FINISHED` → `media_publish`.
- Carousel: child containers (`is_carousel_item`) → parent `media_type: CAROUSEL` →
  `media_publish`.

Scheduling stores a `ScheduledPost` and enqueues a BullMQ job with the right delay.
A separate worker (`apps/api/src/worker.ts`) runs the jobs in production. In mock mode an
in-process timer is used.

Media must be reachable by Meta over public HTTPS. `apps/api/src/services/media.ts`
stores uploads locally for development; swap `MediaStorage` for S3/R2 in production.

## Audio

`packages/meta/src/audio.ts` wraps the Instagram Audio API (search, trending, original
sounds). Results are typed as `AudioTrack` with a `source` of `trending | original |
meta_music`. The `/audio` route always returns an availability notice; the UI shows it.
Endpoint names are collected in `AUDIO_EDGES` so they can be adjusted in one place when
Meta's reference changes.

## Webhooks and push

- `GET /webhooks/meta` answers the verification challenge.
- `POST /webhooks/meta` verifies `X-Hub-Signature-256` against the raw body, normalizes
  entries (`messages`, `message_reactions`, `comments`, `mentions`) and fans out Web Push
  with title = sender · account label and a deep link (`/inbox/{conversationId}`).
- `PushService.shouldDeliver()` applies per-account preferences, quiet hours, and the
  priority-contact bypass.
- The service worker (`apps/web/public/sw.js`) shows the notification, sets the app badge,
  and focuses/opens the deep link on click.

## Security

- Instagram passwords are never requested or stored.
- Tokens are encrypted at rest; the key never touches the database.
- OAuth uses a random `state` kept in an httpOnly cookie scoped to `/auth/meta`.
- Owner login uses scrypt-hashed passwords and a rate-limited login route.
- Disconnecting deletes the account row and its tokens (cascade) and can call
  `revokePermissions()`.
- CORS is restricted to `WEB_URL`; the API is HTTPS-only in production.

## Not built on purpose

No endpoint fetches another account's media, trending posts, suggested users, or anything
that is not owned content or an existing conversation. See `docs/PRODUCT_RULES.md`.
