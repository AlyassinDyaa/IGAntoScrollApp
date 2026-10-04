"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Copy, FilePen, Film, LayoutGrid } from "lucide-react";
import type { ConnectedAccount, Draft, OwnedMedia, ScheduledPost } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { AccountDot, Button, EmptyState, EndOfList, ErrorNote, IconTabs, Spinner } from "@/components/ui";
import { post, useApi } from "@/lib/api";
import { formatCount, formatSchedule, timeAgo } from "@/lib/format";

type Tab = "published" | "drafts" | "scheduled";

/** Instagram profile grid for owned content only. Icon tabs like the profile page. */
export function ContentScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "published";
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const list = accounts.data?.accounts ?? [];
  const accountById = new Map(list.map((a) => [a.id, a]));

  return (
    <>
      <TopBar title="Content" subtitle={accounts.data ? `${list.length} accounts` : undefined} />
      <div className="flex items-center gap-4 px-4 pt-4 pb-3">
        <div className="flex -space-x-3">
          {list.map((a) => (
            <span key={a.id} className="rounded-full ring-2 ring-ig-bg"><Avatar name={a.displayName} src={a.avatarUrl} size={44} accent={a.accent} /></span>
          ))}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Your accounts</p>
          <p className="text-xs text-ig-text-secondary">Only content you own. No feed, no suggestions.</p>
        </div>
      </div>
      <IconTabs
        value={tab}
        onChange={(t) => router.replace(`/content?tab=${t}`)}
        options={[
          { value: "published", label: "Published", icon: <LayoutGrid size={24} strokeWidth={1.75} /> },
          { value: "drafts", label: "Drafts", icon: <FilePen size={24} strokeWidth={1.75} /> },
          { value: "scheduled", label: "Scheduled", icon: <CalendarClock size={24} strokeWidth={1.75} /> },
        ]}
      />
      {tab === "published" ? <Published accountById={accountById} /> : tab === "drafts" ? <Drafts accountById={accountById} /> : <Scheduled accountById={accountById} />}
    </>
  );
}

function Published({ accountById }: { accountById: Map<string, ConnectedAccount> }) {
  const media = useApi<{ media: OwnedMedia[] }>("/content/published");
  if (media.error) return <ErrorNote message={media.error} />;
  if (!media.data) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (media.data.media.length === 0) return <EmptyState icon={<LayoutGrid size={28} />} title="No posts yet" body="Content you publish shows up in this grid." />;
  return (
    <>
      <ul className="grid grid-cols-3 gap-[2px] pt-[2px]">
        {media.data.media.map((m) => {
          const acc = accountById.get(m.accountId);
          return (
            <li key={m.id} className="relative aspect-square overflow-hidden bg-ig-bg-highlight">
              {m.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbnailUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-ig-text-secondary">{m.type === "reel" ? <Film size={22} /> : m.type === "carousel" ? <Copy size={22} /> : null}</div>
              )}
              {m.type === "reel" ? <Film size={16} className="absolute top-1.5 right-1.5 text-white drop-shadow" /> : m.type === "carousel" ? <Copy size={16} className="absolute top-1.5 right-1.5 text-white drop-shadow" /> : null}
              {acc ? <span className="absolute bottom-1.5 left-1.5"><AccountDot accent={acc.accent} className="ring-2 ring-black/40" /></span> : null}
              <a href={m.permalink ?? "#"} target="_blank" rel="noopener noreferrer" aria-label="Open on Instagram" className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50 text-sm font-semibold text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100">
                ♥ {formatCount(m.metrics.likes)} · 💬 {formatCount(m.metrics.comments)}
              </a>
            </li>
          );
        })}
      </ul>
      <ul className="mt-2 px-4">
        {media.data.media.map((m) => (
          <li key={m.id} className="ig-divider py-3">
            <p className="truncate text-sm"><span className="font-semibold">{m.type === "reel" ? "Reel" : m.type === "carousel" ? "Carousel" : "Post"}</span> · {m.caption || "No caption"}</p>
            <p className="mt-0.5 text-xs text-ig-text-secondary">{timeAgo(m.publishedAt)} · reach {formatCount(m.metrics.reach)} · saves {formatCount(m.metrics.saves)}{m.metrics.plays != null ? ` · plays ${formatCount(m.metrics.plays)}` : ""}</p>
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
            <span className="flex size-12 items-center justify-center rounded-md bg-ig-bg-highlight text-ig-text-secondary">{d.type === "reel" ? <Film size={18} /> : d.type === "carousel" ? <Copy size={18} /> : <FilePen size={18} />}</span>
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
                {acc ? <><AccountDot accent={acc.accent} />{acc.username}</> : null}
              </p>
              {s.lastError ? <p className="mt-1 text-xs text-ig-error">{s.lastError}</p> : null}
              {s.permalink ? <a href={s.permalink} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-ig-primary">View post</a> : null}
            </div>
            {s.status === "scheduled" ? <Button size="sm" variant="danger" onClick={() => void post(`/scheduled/${s.id}/cancel`, {}).then(() => scheduled.reload())}>Cancel</Button> : null}
          </li>
        );
      })}
    </ul>
  );
}
