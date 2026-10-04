"use client";

import { CalendarClock, EyeOff, LayoutGrid, MessageCircle, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import type { Comment, ConnectedAccount, Dashboard } from "@ig-focus-hub/shared";
import { TopBar } from "@/components/TopBar";
import { AccountDot, Button, EndOfList, ErrorNote, ListRow, SectionLabel, Spinner } from "@/components/ui";
import { ACCENT_CLASS } from "@/lib/accounts";
import { post, useApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/** Modeled on Instagram's Professional dashboard: an insights card, then "Your tools" rows. */
export function BusinessScreen() {
  const dash = useApi<Dashboard>("/business/dashboard");
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const comments = useApi<{ comments: Comment[] }>("/business/comments?unanswered=1");
  const d = dash.data;

  return (
    <>
      <TopBar title="Professional dashboard" subtitle={accounts.data ? `${accounts.data.accounts.length} accounts` : undefined} />
      {dash.error ? <ErrorNote message={dash.error} /> : null}

      <SectionLabel>Today</SectionLabel>
      {!d ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="mx-4 grid grid-cols-2 divide-x divide-y divide-ig-separator-elevated overflow-hidden rounded-xl border border-ig-separator-elevated">
          <Stat label="Unread messages" value={d.unreadDms} />
          <Stat label="Need a reply" value={d.needReply} />
          <Stat label="Open comments" value={d.unansweredComments} />
          <Stat label="Scheduled" value={d.scheduled} />
        </div>
      )}

      <SectionLabel>Your tools</SectionLabel>
      <ListRow icon={<Send size={22} strokeWidth={1.75} />} label="Conversations needing a reply" value={d ? String(d.needReply) : undefined} href="/inbox" />
      <ListRow icon={<MessageCircle size={22} strokeWidth={1.75} />} label="Comments" value={comments.data ? String(comments.data.comments.length) : undefined} onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" })} />
      <ListRow icon={<CalendarClock size={22} strokeWidth={1.75} />} label="Scheduled content" value={d ? String(d.scheduled) : undefined} href="/content?tab=scheduled" />
      <ListRow icon={<LayoutGrid size={22} strokeWidth={1.75} />} label="Content library" href="/content" />
      <ListRow icon={<MessageSquareText size={22} strokeWidth={1.75} />} label="Saved replies" value="4" href="/settings" />

      <SectionLabel>Account activity</SectionLabel>
      <ul className="px-4">
        {(d?.accounts ?? []).map((a) => (
          <li key={a.accountId} className="ig-divider flex items-center gap-3 py-3">
            <span className={`h-5 w-12 rounded-full ${ACCENT_CLASS[a.accent as keyof typeof ACCENT_CLASS] ?? "bg-ig-bg-highlight"}`} />
            <span className="flex-1 text-sm font-semibold">{a.label}</span>
            <span className="text-xs text-ig-text-secondary">{a.unreadDms} unread{a.needReply ? ` · ${a.needReply} need reply` : ""}</span>
          </li>
        ))}
      </ul>

      <div id="comments" className="flex items-center justify-between px-4 pt-6 pb-2">
        <h2 className="text-base font-bold">Comments</h2>
        <span className="text-xs text-ig-text-secondary">{comments.data?.comments.length ?? 0} waiting</span>
      </div>
      {comments.error ? <ErrorNote message={comments.error} /> : null}
      <ul>
        {(comments.data?.comments ?? []).map((c) => (
          <CommentRow key={c.id} comment={c} account={accounts.data?.accounts.find((a) => a.id === c.accountId) ?? null} onDone={() => { comments.reload(); dash.reload(); }} />
        ))}
      </ul>
      {comments.data && comments.data.comments.length === 0 ? <EndOfList>No comments waiting.</EndOfList> : null}
      {comments.data && comments.data.comments.length > 0 ? <EndOfList>That&apos;s every open comment.</EndOfList> : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-4">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-ig-text-secondary">{label}</p>
    </div>
  );
}

function CommentRow({ comment: c, account, onDone }: { comment: Comment; account: ConnectedAccount | null; onDone: () => void }) {
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!account || !reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await post(`/business/comments/${c.id}/reply`, { accountId: account.id, text: reply.trim() });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function hide() {
    if (!account) return;
    setBusy(true);
    try {
      await post(`/business/comments/${c.id}/hide`, { accountId: account.id, hide: true });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ig-bg-highlight text-xs font-semibold uppercase">{c.username.slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5"><span className="font-semibold">{c.username}</span> {c.text}</p>
          <p className="mt-1 flex items-center gap-3 text-xs text-ig-text-secondary">
            <span>{timeAgo(c.createdAt)}</span>
            {account ? <span className="inline-flex items-center gap-1"><AccountDot accent={account.accent} />{account.label}</span> : null}
            <button type="button" onClick={() => setOpen((v) => !v)} className="font-semibold">Reply</button>
            <button type="button" onClick={() => void hide()} disabled={busy} className="inline-flex items-center gap-1 font-semibold"><EyeOff size={12} /> Hide</button>
          </p>
          {open ? (
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply as ${account?.username ?? ""}…`} className="h-9 flex-1 rounded-pill border border-ig-separator bg-transparent px-3 text-sm outline-none" />
              <Button size="sm" type="submit" disabled={!reply.trim() || busy}>Post</Button>
            </form>
          ) : null}
          {error ? <p className="mt-1 text-xs text-ig-error">{error}</p> : null}
        </div>
      </div>
    </li>
  );
}
