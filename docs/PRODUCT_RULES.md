# Anti-doomscrolling rules

These are product requirements (spec section 9), encoded in
`packages/shared/src/feature-matrix.ts` as `ANTI_SCROLL_RULES` and shown in Settings.

| Rule | How the code enforces it |
| --- | --- |
| No home feed | There is no route, API endpoint or data model for followed accounts' posts. |
| No Explore | No discovery grid, trending or suggested accounts anywhere. |
| No Reel browser | `/reel/[id]` opens only from a DM message id; the content grid shows owned media only. |
| No swipe-next | The viewer has React / Reply / Back to DM and nothing else. |
| No algorithmic recommendations | The API never calls engagement-based endpoints. |
| Finite lists | Inbox (100), comments (100), content (24/page) with an explicit end-of-list marker. |
| Action-first home | `/` redirects to `/inbox`; the PWA `start_url` is `/inbox`. |
| Exit after task | Sending shows "Back to Inbox"; publishing lands on a success screen with "Back to dashboard". |

Pull requests that violate any row are rejected regardless of how useful the feature seems.
