"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Film, Images, Play } from "lucide-react";
import type { ConnectedAccount, Draft, OwnedMedia, ScheduledPost } from "@ig-focus-hub/shared";
import { TopBar } from "@/components/TopBar";
import { AccountDot, Button, EmptyState, EndOfList, ErrorNote, Segmented, Spinner } from "@/components/ui";
import { post, useApi } from "@/lib/api";
import { formatCount, formatSchedule, timeAgo } from "@/lib/format";

type Tab = "published" | "drafts" | "scheduled";

/** Owned content only: Published, Drafts, Scheduled. Never anyone else's posts. */
export function ContentScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "published";
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const accountById = new Map((accounts.data?.accounts ?? []).map((a) => [a.id, a]));

  return (
    <>
      <TopBar title="Content" subtitle={accounts.data ? `${accounts.data.accounts.length} accounts` : undefined} />
      <div className="px-4 pt-3">
        <Segmented value={tab} onChange={(t) => router.replace(`/content?tab=${t}`)} options={[{ value: "published", label: "Published" }, { value: "drafts", label: "Drafts" }, { value: "scheduled", label: "Scheduled" }]} />
      </div>
      {tab === "published" ? <Published accountById={accountById} /> : tab === "drafts" ? <Drafts accountById={accountById} /> : <Scheduled accountById={accountById} />}
    </>
  );
}

function Published({ accountById }: { accountById: Map<string, ConnectedAccount> }) {
  const media = useApi<{ media: OwnedMedia[] }>("/content/published");
  if (media.error) return <ErrorNote message={media.error} />;
  if (!media.data) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (media.data.media.length === 0) return <EmptyState icon={<Images size={28} />} title="No posts yet" body="Content you publish from here or Instagram shows up in this grid." />;
  return (
    <>
      <ul className="mt-3 grid grid-cols-3 gap-0.5">
        {media.data.media.map((m) => {
          const acc = accountById.get(m.accountId);
          return (
            <li key={m.id} className="relative aspect-square overflow-hidden bg-ig-bg-highlight">
              {m.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbnailUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-ig-text-secondary">{m.type === "reel" ? <Film size={22} /> : m.type === "carousel" ? <Images size={22} /> : <Play size={22} />}</div>
              )}
              {acc ? <span className="absolute top-1.5 left-1.5"><AccountDot accent={acc.accent} className="ring-2 ring-white" /></span> : null}
              <a href={m.permalink ?? "#"} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-1.5 text-[11px] font-semibold text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100">
                ♥ {formatCount(m.metrics.likes)} · 💬 {formatCount(m.metrics.comments)}{m.metrics.plays != null ? ` · ▶ ${formatCount(m.metrics.plays)}` : ""}
              </a>
            </li>
          );
        })}
      </ul>
      <ul className="mt-2 px-4">
        {media.data.media.map((m) => (
          <li key={m.id} className="ig-divider py-3">
            <p className="truncate text-sm"><span className="font-semibold">{m.type === "reel" ? "Reel" : m.type === "carousel" ? "Carousel" : "Post"}</span> · {m.caption || "No caption"}</p>
            <p className="mt-0.5 text-xs text-ig-text-secondary">
              {timeAgo(m.publishedAt)} · reach {formatCount(m.metrics.reach)} · saves {formatCount(m.metrics.saves)}
            </p>
          </li>
        ))}
      </ul>
      <EndOfList>That&apos;s all your published content.</EndOfList>
    </>
  );
}

function Drafts({ accountById }: { accountById: Map<string, ConnectedAccount> }) {
  const drafts = useApi<{ drafts: Draft[] }>("/drafts");
  if (drafts.error) return <ErrorNote message={drafts.error} />;
  if (!drafts.data) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (drafts.data.drafts.length === 0) return <EmptyState title="No drafts" body="Unfinished posts are saved here, not inside Instagram." />;
  return (
    <ul>
      {drafts.data.drafts.map((d) => {
        const acc = d.accountId ? accountById.get(d.accountId) : null;
        return (
          <li key={d.id} className="ig-divider flex items-center gap-3 px-4 py-3">
            <span className="flex size-12 items-center justify-center rounded-md bg-ig-bg-highlight text-ig-text-secondary">{d.type === "reel" ? <Film size={18} /> : d.type === "carousel" ? <Images size={18} /> : <Play size={18} />}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.caption.split("\n")[0] || "Untitled draft"}</p>
              <p className="flex items-center gap-1.5 text-xs text-ig-text-secondary">
                {d.type} · edited {timeAgo(d.updatedAt)} {acc ? <><span>·</span><AccountDot accent={acc.accent} />{acc.label}</> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Scheduled({ accountById }: { accountById: Map<string, ConnectedAccount> }) {
  const scheduled = useApi<{ scheduled: ScheduledPost[] }>("/scheduled");
  if (scheduled.error) return <ErrorNote message={scheduled.error} />;
  if (!scheduled.data) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (scheduled.data.scheduled.length === 0) return <EmptyState title="Nothing scheduled" body="Schedule from Create and we publish it for you." />;
  return (
    <ul>
      {scheduled.data.scheduled.map((s) => {
        const acc = accountById.get(s.accountId);
        return (
          <li key={s.id} className="ig-divider flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{formatSchedule(s.publishAt)}</p>
              <p className="flex items-center gap-1.5 text-xs text-ig-text-secondary">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${s.status === "failed" ? "bg-ig-error/10 text-ig-error" : s.status === "published" ? "bg-ig-success/10 text-ig-success" : "bg-ig-bg-highlight"}`}>{s.status}</span>
                {acc ? <><AccountDot accent={acc.accent} />@{acc.username}</> : null}
              </p>
              {s.lastError ? <p className="mt-1 text-xs text-ig-error">{s.lastError}</p> : null}
              {s.permalink ? <a href={s.permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-ig-primary">View post</a> : null}
            </div>
            {s.status === "scheduled" ? (
              <Button size="sm" variant="danger" onClick={() => void post(`/scheduled/${s.id}/cancel`, {}).then(() => scheduled.reload())}>Cancel</Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
