# Create studio

```
CREATE REEL

[ Video Preview ]

✂️ Trim   ▣ Crop   Aa Text   🎵 Add Audio   🔊 Volume   🖼 Cover

Music
┌──────────────────────────────┐
│ 🔎 Search audio...           │
├──────────────────────────────┤
│ ♪ Trending audio             │
│ ♪ Original sounds            │
│ ♪ Meta music                 │
└──────────────────────────────┘

Caption
┌──────────────────────────────┐
│ New product available 🔥     │
│ #smallbusiness               │
└──────────────────────────────┘

Account: @yourbusiness ▼

           PUBLISH
```

Implementation: `apps/web/app/(tabs)/create/CreateStudio.tsx`.

| Feature | Where | Notes |
| --- | --- | --- |
| Upload photo/video | Upload button → `POST /media/upload` | JPG/PNG/WebP/MP4/MOV, 300 MB cap |
| Trim | Trim sheet, `edits.trimStartSec/trimEndSec` | Preview loops inside the range; 3-90s for Reels |
| Crop / rotate | Crop sheet, `edits.aspect`, `edits.rotation` | 1:1, 4:5, 9:16, 1.91:1 presets |
| Text overlays | Text sheet, `edits.textOverlays` | Position presets, size S/M/L, 5 colors |
| Add audio | Audio sheet → `GET /audio` | Instagram Audio API; search, trending, original sounds |
| Volume | Volume sheet, `edits.originalVolume`, `edits.audioVolume` | Music vs original mix |
| Cover | Cover sheet, `edits.coverTimeSec` | Sent as `thumb_offset` |
| Caption + hashtags | Textarea | 2,200 chars, 30 hashtags, counted live |
| Tag people / location | Tags sheet | `user_tags`, `location_id` (Page ID with location) |
| Rename original audio | Reel option | Sent as `audio_name` |
| Share Reel to feed | Reel toggle | `share_to_feed` |
| Account | `AccountPicker` | Always visible above Publish |
| Publish / Schedule | `POST /publish` | Container → poll → publish; schedule via queue |

## What Meta does not give us

Instagram's own editor (filters, effects, templates, animated text, stickers, Remix) is not
exposed to third-party apps. We recreate the practical subset above.

## Phase 2: rendering

Right now trim, crop, rotation, text and volume are stored on the draft and previewed in
the browser; the uploaded file is published as-is. Phase 2 adds a render step
(ffmpeg on the API, or ffmpeg.wasm in the browser for short clips) that applies the edits
and mixes the selected audio before the container is created.

## Music availability

Third-party apps do not necessarily receive the complete music library visible inside the
Instagram app. Availability depends on the account, region, licensing and API access. The
audio picker always shows a notice to that effect, and we never promise that every song
in Instagram will appear in the hub.
