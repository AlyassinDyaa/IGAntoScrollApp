# Feature availability

Source of truth: `packages/shared/src/feature-matrix.ts` (also rendered in Settings).

| Capability | What the app can do | Status |
| --- | --- | --- |
| 1:1 DMs | Read/reply through supported messaging APIs | Ready |
| DM reactions | React/unreact where supported | Ready |
| Sent Reel message | Display shared content and open the exact Reel | Meta-dependent |
| Direct Reel playback | Use direct media URL only when Meta exposes it | Meta-dependent |
| Group DMs | Not supported | Not available |
| Arbitrary new DMs | May be restricted by Meta conversation rules | Meta-dependent |
| Push notifications | PWA Web Push + webhook events | Custom |
| Three accounts | Separate tokens/identities in one hub | Custom |
| Publish photo/video | Owned media through Meta where authorized | Ready |
| Publish Reels | Supported Reel media | Ready |
| Carousel publishing | Within platform limits (2-10 items) | Ready |
| Scheduling | Our server schedules the publish call | Custom |
| Instagram audio | Search/select supported audio via the Audio API | Meta-dependent |
| Full IG music picker | Entire licensed catalog is not promised | Not available |
| Basic editing | Trim/crop/text/cover/volume implemented by us | Custom |
| Comments | Read/reply/manage where supported | Ready |
| Insights | Metrics Meta exposes for professional accounts | Ready |
| Stories | Depends on account, authentication and API route | Meta-dependent |
| Ads manager | Out of scope | Not available |
