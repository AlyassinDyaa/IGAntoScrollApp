"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, Crop, ImageIcon, MapPin, Music, Plus, Scissors, Type, UserRoundPlus, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioTrack, ConnectedAccount, Draft, MediaEdits, PostType } from "@ig-focus-hub/shared";
import { ASPECT_PRESETS, DEFAULT_MEDIA_EDITS, PUBLISH_LIMITS } from "@ig-focus-hub/shared";
import { AccountPicker } from "@/components/AccountPicker";
import { TopBar } from "@/components/TopBar";
import { AccountBadge, Button, Chip, ErrorNote, Segmented, Sheet, Spinner, Toggle } from "@/components/ui";
import { API_URL, post, put, useApi } from "@/lib/api";
import { formatDuration } from "@/lib/format";

type Tool = "trim" | "crop" | "text" | "audio" | "volume" | "cover" | "schedule" | "tags" | null;
type UiType = "post" | "reel" | "carousel";

interface LocalMedia {
  id: string;
  file: File;
  url: string;
  kind: "image" | "video";
  assetId: string | null;
  uploading: boolean;
}

const ASPECT_CSS: Record<string, string> = { "1:1": "1 / 1", "4:5": "4 / 5", "9:16": "9 / 16", "1.91:1": "1.91 / 1" };

/**
 * Creation studio. Everything here is built by us: trim, crop, text, cover,
 * volume. Audio comes from the Instagram Audio API (supported audio only).
 */
export function CreateStudio() {
  const router = useRouter();
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const [uiType, setUiType] = useState<UiType>("reel");
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [caption, setCaption] = useState("");
  const [edits, setEdits] = useState<MediaEdits>(DEFAULT_MEDIA_EDITS);
  const [audio, setAudio] = useState<AudioTrack | null>(null);
  const [originalAudioTitle, setOriginalAudioTitle] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [chosenAccountId, setAccountId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [scheduleMin, setScheduleMin] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: "published" | "scheduled"; as: string; permalink?: string | null; when?: string } | null>(null);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accountList = useMemo(() => accounts.data?.accounts ?? [], [accounts.data]);
  const accountId = chosenAccountId ?? accountList[0]?.id ?? null;
  const account = accountList.find((a) => a.id === accountId) ?? null;

  const primary = media[0] ?? null;
  const isVideo = primary?.kind === "video";
  const postType: PostType = uiType === "carousel" ? "carousel" : uiType === "reel" ? "reel" : isVideo ? "video" : "image";
  const hashtags = (caption.match(/#\w+/g) ?? []).length;
  const aspect = edits.aspect ?? (uiType === "reel" ? "9:16" : "1:1");

  // Keep playback inside the trim window.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const end = edits.trimEndSec ?? v.duration;
      const start = edits.trimStartSec ?? 0;
      if (v.currentTime >= end || v.currentTime < start) v.currentTime = start;
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [edits.trimStartSec, edits.trimEndSec, primary?.url]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = edits.originalVolume;
  }, [edits.originalVolume, primary?.url]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: LocalMedia[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
      kind: file.type.startsWith("video/") ? "video" : "image",
      assetId: null,
      uploading: true,
    }));
    setMedia((m) => (uiType === "carousel" ? [...m, ...next].slice(0, PUBLISH_LIMITS.carouselMaxItems) : next.slice(0, 1)));
    setResult(null);
    for (const item of next) void upload(item);
  }

  async function upload(item: LocalMedia) {
    const form = new FormData();
    form.append("file", item.file);
    try {
      const res = await fetch(`${API_URL}/media/upload`, { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Upload failed");
      const json = (await res.json()) as { assetId: string };
      setMedia((m) => m.map((x) => (x.id === item.id ? { ...x, assetId: json.assetId, uploading: false } : x)));
    } catch (e) {
      setError((e as Error).message);
      setMedia((m) => m.filter((x) => x.id !== item.id));
    }
  }

  function removeMedia(id: string) {
    setMedia((m) => m.filter((x) => x.id !== id));
  }

  function captureCover() {
    const v = videoRef.current;
    if (!v) return;
    setEdits((e) => ({ ...e, coverTimeSec: v.currentTime }));
  }

  const canSubmit =
    !!account && media.length > 0 && media.every((m) => !m.uploading && m.assetId) && (uiType !== "carousel" || media.length >= PUBLISH_LIMITS.carouselMinItems) && !busy;

  async function submit(schedule: boolean) {
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      const userTags = tags
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/^@/, ""))
        .filter(Boolean)
        .map((username) => ({ username, x: 0.5, y: 0.5 }));
      const draft = await put<Draft>("/drafts", {
        accountId: account.id,
        type: postType,
        caption,
        mediaAssetIds: media.map((m) => m.assetId!),
        edits,
        audioTrackId: audio?.id ?? null,
        originalAudioTitle: originalAudioTitle || null,
        shareToFeed,
        locationId: location || null,
        userTags,
      });
      const res = await post<{ scheduled?: { publishAt: string }; published?: { permalink: string | null }; publishAs: { username: string } }>("/publish", {
        draftId: draft.id,
        accountId: account.id,
        ...(schedule && scheduleAt ? { publishAt: new Date(scheduleAt).toISOString() } : {}),
      });
      setResult(
        res.scheduled
          ? { kind: "scheduled", as: res.publishAs.username, when: res.scheduled.publishAt }
          : { kind: "published", as: res.publishAs.username, permalink: res.published?.permalink ?? null },
      );
      setTool(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMedia([]);
    setCaption("");
    setEdits(DEFAULT_MEDIA_EDITS);
    setAudio(null);
    setOriginalAudioTitle("");
    setResult(null);
    setScheduleAt("");
    setTags("");
    setLocation("");
  }

  if (result) {
    return (
      <>
        <TopBar title="Create" subtitle={`${accountList.length} accounts`} />
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <span className="mb-4 flex size-16 items-center justify-center rounded-full border-2 border-ig-success text-2xl text-ig-success">✓</span>
          <p className="text-base font-semibold">{result.kind === "published" ? "Published" : "Scheduled"} as @{result.as}</p>
          <p className="mt-1 text-sm text-ig-text-secondary">
            {result.kind === "published" ? "Your content is live. Nothing else to see here." : `Goes out ${new Date(result.when!).toLocaleString()}. We'll publish it for you.`}
          </p>
          {result.permalink ? (
            <a href={result.permalink} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm font-semibold text-ig-primary">View on Instagram</a>
          ) : null}
          <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
            <Button block onClick={() => router.push("/business")}>Back to dashboard</Button>
            <Button block variant="secondary" onClick={reset}>Create another</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Create" subtitle={accounts.data ? `${accountList.length} accounts` : undefined} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple={uiType === "carousel"} capture={undefined} className="hidden" onChange={(e) => addFiles(e.target.files)} />

      <div className="space-y-5 px-4 pt-4">
        {/* Preview */}
        <div className="mx-auto w-full max-w-[360px]">
          {primary ? (
            <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: ASPECT_CSS[aspect] }}>
              {primary.kind === "video" ? (
                <video ref={videoRef} src={primary.url} playsInline muted={edits.originalVolume === 0} autoPlay loop controls={false} onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} className="size-full object-cover" style={{ transform: `rotate(${edits.rotation}deg)` }} />
              ) : (
                <LocalImage src={primary.url} className="size-full object-cover" style={{ transform: `rotate(${edits.rotation}deg)` }} />
              )}
              {edits.textOverlays.map((t, i) => (
                <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 font-bold drop-shadow" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, color: t.color, fontSize: t.size === "l" ? 28 : t.size === "m" ? 20 : 14 }}>
                  {t.text}
                </span>
              ))}
              {audio ? <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-pill bg-black/60 px-2 py-1 text-[11px] text-white"><Music size={12} /> {audio.title}</span> : null}
              {primary.uploading ? <span className="absolute top-2 right-2 rounded-pill bg-black/60 px-2 py-1 text-[11px] text-white">Uploading…</span> : null}
              <button type="button" onClick={() => removeMedia(primary.id)} aria-label="Remove media" className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"><X size={14} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ig-separator bg-ig-bg-secondary text-sm font-semibold text-ig-text-secondary" style={{ aspectRatio: uiType === "reel" ? "9 / 16" : "1 / 1", maxHeight: 360 }}>
              <Plus size={28} />
              Upload photo or video
              <span className="text-xs font-normal">JPG, PNG, MP4, MOV</span>
            </button>
          )}
          {uiType === "carousel" ? (
            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
              {media.map((m) => (
                <div key={m.id} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-black">
                  {m.kind === "video" ? <video src={m.url} muted className="size-full object-cover" /> : <LocalImage src={m.url} className="size-full object-cover" />}
                  <button type="button" onClick={() => removeMedia(m.id)} aria-label="Remove" className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={10} /></button>
                </div>
              ))}
              {media.length < PUBLISH_LIMITS.carouselMaxItems ? (
                <button type="button" onClick={() => fileRef.current?.click()} className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-ig-separator text-ig-text-secondary"><Plus size={18} /></button>
              ) : null}
              <span className="self-center text-xs text-ig-text-secondary">{media.length}/{PUBLISH_LIMITS.carouselMaxItems}</span>
            </div>
          ) : null}
        </div>

        <Segmented value={uiType} onChange={(v) => { setUiType(v); setEdits((e) => ({ ...e, aspect: null })); if (v !== "carousel") setMedia((m) => m.slice(0, 1)); }} options={[{ value: "post", label: "Post" }, { value: "reel", label: "Reel" }, { value: "carousel", label: "Carousel" }]} />

        {/* Tools */}
        <div>
          <p className="mb-2 text-sm font-semibold">Tools</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <ToolButton icon={<Scissors size={20} />} label="Trim" onClick={() => setTool("trim")} disabled={!isVideo} />
            <ToolButton icon={<Crop size={20} />} label="Crop" onClick={() => setTool("crop")} disabled={!primary} />
            <ToolButton icon={<Type size={20} />} label="Text" onClick={() => setTool("text")} disabled={!primary} />
            <ToolButton icon={<Music size={20} />} label="Audio" onClick={() => setTool("audio")} disabled={uiType !== "reel"} badge={audio ? "1" : undefined} />
            <ToolButton icon={<Volume2 size={20} />} label="Volume" onClick={() => setTool("volume")} disabled={!isVideo} />
            <ToolButton icon={<ImageIcon size={20} />} label="Cover" onClick={() => setTool("cover")} disabled={!isVideo} />
          </div>
        </div>

        {/* Caption */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Caption</p>
            <span className={`text-xs ${hashtags > PUBLISH_LIMITS.hashtagMax || caption.length > PUBLISH_LIMITS.captionMaxChars ? "text-ig-error" : "text-ig-text-secondary"}`}>
              {caption.length}/{PUBLISH_LIMITS.captionMaxChars} · {hashtags}/{PUBLISH_LIMITS.hashtagMax} #
            </span>
          </div>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder={"New product available 🔥\n#smallbusiness"} className="w-full rounded-ig border border-ig-separator bg-transparent p-3 text-sm outline-none placeholder:text-ig-text-secondary" />
        </div>

        {/* Options */}
        <div className="divide-y divide-ig-separator-elevated rounded-ig border border-ig-separator">
          <button type="button" onClick={() => setTool("tags")} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm">
            <UserRoundPlus size={18} className="text-ig-text-secondary" />
            <span className="flex-1">Tag people</span>
            <span className="text-xs text-ig-text-secondary">{tags ? tags.split(/[,\s]+/).filter(Boolean).length : "None"}</span>
          </button>
          <button type="button" onClick={() => setTool("tags")} className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm">
            <MapPin size={18} className="text-ig-text-secondary" />
            <span className="flex-1">Add location</span>
            <span className="truncate text-xs text-ig-text-secondary">{location || "None"}</span>
          </button>
          {uiType === "reel" ? (
            <label className="flex items-center gap-3 px-3 py-3 text-sm">
              <span className="flex-1">Also share to feed</span>
              <Toggle checked={shareToFeed} onChange={setShareToFeed} label="Share to feed" />
            </label>
          ) : null}
          {uiType === "reel" ? (
            <label className="flex flex-col gap-1 px-3 py-3 text-sm">
              <span>Rename original audio</span>
              <input value={originalAudioTitle} onChange={(e) => setOriginalAudioTitle(e.target.value)} maxLength={80} placeholder={`Original audio · ${account ? "@" + account.username : "you"}`} className="bg-transparent text-sm outline-none placeholder:text-ig-text-secondary" />
            </label>
          ) : null}
        </div>

        {/* Account + publish */}
        <AccountPicker accounts={accountList} value={accountId} onChange={setAccountId} label="Publish as" />
        {error ? <ErrorNote message={error} /> : null}
        <div className="flex flex-col gap-2 pb-4">
          {account ? <div className="flex justify-center"><AccountBadge account={account} prefix="Publishing as " /></div> : null}
          <Button size="lg" block disabled={!canSubmit} onClick={() => void submit(false)}>
            {busy ? <Spinner /> : "Publish"}
          </Button>
          <Button size="lg" block variant="secondary" disabled={!canSubmit} onClick={() => { setScheduleMin(toLocalInput(new Date(Date.now() + 5 * 60_000))); setTool("schedule"); }}>
            <CalendarClock size={18} /> Schedule
          </Button>
        </div>
      </div>

      {/* ---- Tool sheets ---- */}
      <Sheet open={tool === "trim"} onClose={() => setTool(null)} title="Trim">
        <p className="mb-3 text-xs text-ig-text-secondary">Reels can be {PUBLISH_LIMITS.reelMinDurationSec}-{PUBLISH_LIMITS.reelMaxDurationSec}s. Playback loops inside the selected range.</p>
        <RangeField label="Start" value={edits.trimStartSec ?? 0} max={duration} onChange={(v) => setEdits((e) => ({ ...e, trimStartSec: Math.min(v, (e.trimEndSec ?? duration) - 1) }))} />
        <RangeField label="End" value={edits.trimEndSec ?? duration} max={duration} onChange={(v) => setEdits((e) => ({ ...e, trimEndSec: Math.max(v, (e.trimStartSec ?? 0) + 1) }))} />
        <p className="mt-2 text-sm">Length: <strong>{formatDuration((edits.trimEndSec ?? duration) - (edits.trimStartSec ?? 0))}</strong></p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEdits((e) => ({ ...e, trimStartSec: null, trimEndSec: null }))}>Reset</Button>
      </Sheet>

      <Sheet open={tool === "crop"} onClose={() => setTool(null)} title="Crop & rotate">
        <p className="mb-2 text-sm font-semibold">Aspect ratio</p>
        <div className="flex flex-wrap gap-2">
          {ASPECT_PRESETS.map((p) => (
            <Chip key={p.id} active={aspect === p.id} onClick={() => setEdits((e) => ({ ...e, aspect: p.id }))}>{p.label} {p.id}</Chip>
          ))}
        </div>
        <p className="mt-5 mb-2 text-sm font-semibold">Rotate</p>
        <div className="flex gap-2">
          {([0, 90, 180, 270] as const).map((r) => (
            <Chip key={r} active={edits.rotation === r} onClick={() => setEdits((e) => ({ ...e, rotation: r }))}>{r}°</Chip>
          ))}
        </div>
      </Sheet>

      <Sheet open={tool === "text"} onClose={() => setTool(null)} title="Text">
        <TextTool overlays={edits.textOverlays} onChange={(textOverlays) => setEdits((e) => ({ ...e, textOverlays }))} />
      </Sheet>

      <Sheet open={tool === "audio"} onClose={() => setTool(null)} title="Add audio">
        <AudioPicker accountId={accountId} value={audio} onChange={setAudio} />
      </Sheet>

      <Sheet open={tool === "volume"} onClose={() => setTool(null)} title="Volume">
        <RangeField label="Original video" value={edits.originalVolume} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setEdits((e) => ({ ...e, originalVolume: v }))} />
        <RangeField label={audio ? `Music · ${audio.title}` : "Music (add audio first)"} value={edits.audioVolume} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setEdits((e) => ({ ...e, audioVolume: v }))} />
      </Sheet>

      <Sheet open={tool === "cover"} onClose={() => setTool(null)} title="Cover">
        <p className="mb-3 text-xs text-ig-text-secondary">Scrub to the frame you want, then set it as the cover. Instagram uses this frame as the Reel thumbnail.</p>
        <RangeField label="Frame" value={edits.coverTimeSec ?? 0} max={duration} format={formatDuration} onChange={(v) => { if (videoRef.current) videoRef.current.currentTime = v; setEdits((e) => ({ ...e, coverTimeSec: v })); }} />
        <Button size="sm" className="mt-2" onClick={captureCover}>Use current frame</Button>
        {edits.coverTimeSec != null ? <p className="mt-2 text-xs text-ig-text-secondary">Cover at {formatDuration(edits.coverTimeSec)}</p> : null}
      </Sheet>

      <Sheet open={tool === "tags"} onClose={() => setTool(null)} title="Tag people & location">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">People</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="@friend, @partner" className="w-full rounded-ig border border-ig-separator bg-transparent px-3 py-2 text-sm outline-none" />
          <span className="mt-1 block text-xs text-ig-text-secondary">Tags are placed at the center of the image. Meta only allows tagging public accounts.</span>
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-semibold">Location (Facebook Page ID)</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 7640348500" className="w-full rounded-ig border border-ig-separator bg-transparent px-3 py-2 text-sm outline-none" />
          <span className="mt-1 block text-xs text-ig-text-secondary">Meta requires the ID of a Page with a location. Search comes in a later phase.</span>
        </label>
      </Sheet>

      <Sheet
        open={tool === "schedule"}
        onClose={() => setTool(null)}
        title="Schedule"
        footer={
          <Button block size="lg" disabled={!scheduleAt || !canSubmit} onClick={() => void submit(true)}>
            {busy ? <Spinner /> : `Schedule as @${account?.username ?? ""}`}
          </Button>
        }
      >
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Publish at</span>
          <input type="datetime-local" value={scheduleAt} min={scheduleMin} onChange={(e) => setScheduleAt(e.target.value)} className="w-full rounded-ig border border-ig-separator bg-transparent px-3 py-2 text-sm outline-none" />
        </label>
        <p className="mt-2 text-xs text-ig-text-secondary">Our server publishes it at that time. You can cancel from Content → Scheduled.</p>
      </Sheet>
    </>
  );
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Plain <img> on purpose: blob: object URLs from local uploads are not optimizable. */
function LocalImage({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} style={style} />;
}

function ToolButton({ icon, label, onClick, disabled, badge }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; badge?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="relative flex h-14 flex-col items-center justify-center gap-1 rounded-ig bg-ig-bg-highlight text-xs font-semibold disabled:opacity-40">
      {icon}
      {label}
      {badge ? <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-ig-primary text-[10px] text-white">{badge}</span> : null}
    </button>
  );
}

function RangeField({ label, value, max, step = 0.1, format = formatDuration, onChange }: { label: string; value: number; max: number; step?: number; format?: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="text-ig-text-secondary">{format(value)}</span></span>
      <input type="range" className="ig-range" min={0} max={max || 0} step={step} value={Math.min(value, max || 0)} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function TextTool({ overlays, onChange }: { overlays: MediaEdits["textOverlays"]; onChange: (o: MediaEdits["textOverlays"]) => void }) {
  const [text, setText] = useState("");
  const [size, setSize] = useState<"s" | "m" | "l">("m");
  const [color, setColor] = useState("#ffffff");
  const positions = [
    { label: "Top", x: 0.5, y: 0.15 },
    { label: "Center", x: 0.5, y: 0.5 },
    { label: "Bottom", x: 0.5, y: 0.85 },
  ];
  return (
    <div className="space-y-4">
      <input value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="Type something" className="w-full rounded-ig border border-ig-separator bg-transparent px-3 py-2 text-sm outline-none" />
      <div className="flex gap-2">
        {(["s", "m", "l"] as const).map((s) => <Chip key={s} active={size === s} onClick={() => setSize(s)}>{s.toUpperCase()}</Chip>)}
        {["#ffffff", "#262626", "#ed4956", "#0095f6", "#f09433"].map((c) => (
          <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={`size-8 rounded-full border-2 ${color === c ? "border-ig-primary" : "border-ig-separator"}`} style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-2">
        {positions.map((p) => (
          <Button key={p.label} size="sm" variant="secondary" disabled={!text.trim()} onClick={() => { onChange([...overlays, { text: text.trim(), x: p.x, y: p.y, size, color }]); setText(""); }}>Add {p.label.toLowerCase()}</Button>
        ))}
      </div>
      {overlays.length ? (
        <ul className="space-y-1">
          {overlays.map((o, i) => (
            <li key={i} className="flex items-center justify-between rounded-ig bg-ig-bg-highlight px-3 py-2 text-sm">
              <span className="truncate">{o.text}</span>
              <button type="button" onClick={() => onChange(overlays.filter((_, j) => j !== i))} className="text-xs font-semibold text-ig-error">Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-ig-text-secondary">Text is burned into the video when we render it before upload (Phase 2). The preview shows placement.</p>
    </div>
  );
}

function AudioPicker({ accountId, value, onChange }: { accountId: string | null; value: AudioTrack | null; onChange: (t: AudioTrack | null) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<"trending" | "original">("trending");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const path = accountId ? `/audio?accountId=${accountId}${debounced ? `&q=${encodeURIComponent(debounced)}` : `&list=${list}`}` : null;
  const audio = useApi<{ tracks: AudioTrack[]; notice: string }>(path);
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search audio..." className="w-full rounded-ig bg-ig-bg-highlight px-3 py-2 text-sm outline-none placeholder:text-ig-text-secondary" />
      {!debounced ? (
        <div className="flex gap-2">
          <Chip active={list === "trending"} onClick={() => setList("trending")}>♪ Trending audio</Chip>
          <Chip active={list === "original"} onClick={() => setList("original")}>♪ Original sounds</Chip>
        </div>
      ) : null}
      {value ? (
        <div className="flex items-center justify-between rounded-ig border border-ig-primary px-3 py-2 text-sm">
          <span className="truncate"><Music size={14} className="mr-1 inline" /> {value.title}{value.artist ? ` · ${value.artist}` : ""}</span>
          <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-ig-error">Remove</button>
        </div>
      ) : null}
      {audio.loading ? <div className="flex justify-center py-6"><Spinner /></div> : null}
      {audio.error ? <ErrorNote message={audio.error} /> : null}
      <ul className="divide-y divide-ig-separator-elevated">
        {(audio.data?.tracks ?? []).map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onChange(t)} className="flex w-full items-center gap-3 py-2 text-left">
              <span className="flex size-10 items-center justify-center rounded-lg bg-ig-bg-highlight"><Music size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{t.title}</span>
                <span className="block truncate text-xs text-ig-text-secondary">{t.artist ?? "Unknown"}{t.durationSec ? ` · ${formatDuration(t.durationSec)}` : ""} · {t.source === "original" ? "Original" : t.source === "meta_music" ? "Meta music" : "Trending"}</span>
              </span>
              {value?.id === t.id ? <span className="text-xs font-semibold text-ig-primary">Selected</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {audio.data && audio.data.tracks.length === 0 ? <p className="py-4 text-center text-xs text-ig-text-secondary">No supported audio matched.</p> : null}
      <p className="text-[11px] text-ig-text-secondary">{audio.data?.notice ?? "Audio availability depends on account, region, licensing and API access."}</p>
    </div>
  );
}
