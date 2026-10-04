# Design system: match Instagram

The product should feel instantly familiar to an Instagram user. We borrow Instagram's
visual language and keep our own, sparser information architecture.

## Tokens (`apps/web/app/globals.css`)

**Dark is the default.** `<html data-theme="dark">` is set in the root layout; light values
apply only when `data-theme="light"` is set.

| Token | Light | Dark (default) | Instagram usage |
| --- | --- | --- | --- |
| `--ig-bg` | `#ffffff` | `#000000` | Page background |
| `--ig-bg-secondary` | `#fafafa` | `#121212` | Cards, stat tiles |
| `--ig-bg-highlight` | `#efefef` | `#262626` | Search field, secondary buttons, their bubbles |
| `--ig-text` | `#262626` | `#fafafa` | Primary text |
| `--ig-text-secondary` | `#8e8e8e` | `#a8a8a8` | Timestamps, previews |
| `--ig-separator` | `#dbdbdb` | `#262626` | Borders, tab bar top line |
| `--ig-primary` | `#0095f6` | same | Buttons, links, unread dot, "Send" |
| `--ig-error` | `#ed4956` | same | Destructive, errors |
| `--ig-bubble-mine` | `#3797f0` | same | Own DM bubbles |
| `--ig-gradient` | orange → pink → purple | same | Story ring, brand text, app icon |

Font: system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`).
Base 14px / 18px line height, 12px secondary, 16px compact titles, 20-24px large titles.

## Layout

- **Mobile**: 44px top bar, 50px bottom tab bar + safe-area inset, 630px max content width.
- **Desktop (≥768px)**: Instagram-style 244px left rail with icon + label; content centered.
- Avatars 56px in lists, 28px in thread header, 80px in detail sheets; gradient ring = unread.
- Radius: 8px cards and buttons, 22px pills/chips/bubbles, 16px sheets.

## Components (`apps/web/components`)

| Component | Instagram equivalent |
| --- | --- |
| `TabBar` / `SideNav` | Bottom tabs / left rail. Only Inbox, Create, Business, Content, Settings. |
| `TopBar` | Large title (inbox) or compact centered title with back chevron (thread). |
| `Avatar` | Circle avatar with optional story-style gradient ring. |
| `Chip`, `ChipRow` | Filter pills (All / Personal / Business). |
| `Segmented` | Post / Reel / Carousel switch. |
| `Sheet` | Bottom sheet with drag handle and "Done". |
| `StatTile` | Insights-style numeric tiles. |
| `AccountBadge`, `AccountDot`, `AccountPicker` | Persistent per-account accent + avatar + label. |
| `EndOfList` | "You're all caught up" checkmark. |

## Per-account identity

Each connected account gets a persistent accent (`pink`, `purple`, `orange`, `blue`, `green`),
an avatar and a short label. The sending/publishing account is shown directly above the
composer and the Publish button, every time.

## Icons

`lucide-react` outline icons at 24px, stroke 1.75 (2.5 when active), matching Instagram's
glyph weight: `Send` (inbox), `SquarePlus` (create), `ChartNoAxesColumn` (business),
`LayoutGrid` (content), `Menu` (settings).
