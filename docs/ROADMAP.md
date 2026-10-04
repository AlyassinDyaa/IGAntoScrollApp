# Roadmap

## Phase 1 - Core focus app (this scaffold)

- [x] PWA shell with Instagram design tokens, bottom tabs / desktop rail
- [x] Unified 3-account inbox, filters, search, labels, notes, saved replies, reactions
- [x] Reply safety (sending account always shown and validated)
- [x] Sent-Reels-only viewer
- [x] Web Push: per-account rules, quiet hours, priority contacts, deep links, badge
- [x] Facebook Login OAuth, encrypted tokens, account picker (max 3)
- [x] Mock mode for development without Meta credentials
- [ ] Owner login/register screens in the web app (API routes exist)
- [ ] Page webhook subscription on connect (`subscribed_apps`)
- [ ] Token refresh / `needs_reauth` detection on 190 errors

## Phase 2 - Creation

- [x] Create studio UI: upload, trim, crop, text, audio, volume, cover, caption, tags, location
- [x] Draft model, publish now, schedule, carousel, share to feed, rename original audio
- [ ] Render step applying edits (ffmpeg) before upload
- [ ] Object storage (S3/R2) for media
- [ ] Instagram-like post preview card
- [ ] Location search (Pages with location)

## Phase 3 - Business

- [x] Dashboard (unread, need reply, comments, scheduled)
- [x] Comments hub with reply/hide
- [x] Content library (published / drafts / scheduled)
- [ ] Insights sync (`/insights`) into content library metrics
- [ ] Mentions view
- [ ] Customer workflow board by label

## Phase 4 - Refinement

- [ ] Content templates and caption presets
- [ ] Audit log of published content and replies
- [ ] Optional order/commerce integration
- [ ] E2E tests (Playwright) for the five tabs
