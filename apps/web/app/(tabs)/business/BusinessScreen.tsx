"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";
import type { Comment, ConnectedAccount, Dashboard } from "@ig-focus-hub/shared";
import { StatTile } from "@/components/StatTile";
import { TopBar } from "@/components/TopBar";
import { AccountDot, Button, EndOfList, ErrorNote, SectionTitle, Spinner } from "@/components/ui";
import { ACCENT_CLASS } from "@/lib/accounts";
import { post, useApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/** Answers four questions: who needs a reply, what needs moderation, what is scheduled, how is content doing. */
export function BusinessScreen() {
  const dash = useApi<Dashboard>("/business/dashboard");
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const comments = useApi<{ comments: Comment[] }>("/business/comments?unanswered=1");
  const d = dash.data;

  return (
    <>
      <TopBar title="Business" subtitle={accounts.data ? `${accounts.data.accounts.length} accounts` : undefined} />
      {dash.error ? <ErrorNote message={dash.error} /> : null}
      {!d ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          <StatTile label="Unread DMs" value={d.unreadDms} href="/inbox" />
          <StatTile label="Need reply" value={d.needReply} href="/inbox" />
          <StatTile label="Comments" value={d.unansweredComments} />
          <StatTile label="Scheduled" value={d.scheduled} href="/content?tab=scheduled" />
        </div>
      )}

      <SectionTitle>Account activity</SectionTitle>
      <ul className="px-4">
        {(d?.accounts ?? []).map((a) => (
          <li key={a.accountId} className="ig-divider flex items-center gap-3 py-3">
            <span className={`h-5 w-12 rounded-full ${ACCENT_CLASS[a.accent as keyof typeof ACCENT_CLASS] ?? "bg-ig-bg-highlight"}`} />
            <span className="flex-1 text-sm font-semibold">{a.label}</span>
            <span className="text-xs text-ig-text-secondary">{a.unreadDms} DMs{a.needReply ? ` · ${a.needReply} need reply` : ""}</span>
          </li>
        ))}
      </ul>

      <SectionTitle right={<span className="text-xs text-ig-text-secondary">{comments.data?.comments.length ?? 0} waiting</span>}>Comments needing a reply</SectionTitle>
      {comments.error ? <ErrorNote message={comments.error} /> : null}
      <ul>
        {(comments.data?.comments ?? []).map((c) => (
          <CommentRow key={c.id} comment={c} account={accounts.data?.accounts.find((a) => a.id === c.accountId) ?? null} onDone={() => { comments.reload(); dash.reload(); }} />
        ))}
      </ul>
      {comments.data && comments.data.comments.length === 0 ? <EndOfList>No comments waiting. Nice.</EndOfList> : null}
      {comments.data && comments.data.comments.length > 0 ? <EndOfList>That&apos;s every open comment.</EndOfList> : null}
    </>
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
    <li className="ig-divider px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="size-10 shrink-0 rounded-md bg-ig-bg-highlight" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm"><span className="font-semibold">{c.username}</span> <span className="text-ig-text">{c.text}</span></p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ig-text-secondary">
            {timeAgo(c.createdAt)}
            {account ? <><span>·</span><AccountDot accent={account.accent} />{account.label}</> : null}
            <button type="button" onClick={() => setOpen((v) => !v)} className="ml-2 font-semibold text-ig-text">Reply</button>
            <button type="button" onClick={() => void hide()} disabled={busy} aria-label="Hide comment" className="ml-1 inline-flex items-center gap-1 font-semibold text-ig-text"><EyeOff size={12} /> Hide</button>
          </p>
          {open ? (
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply as @${account?.username ?? ""}`} className="h-9 flex-1 rounded-pill border border-ig-separator bg-transparent px-3 text-sm outline-none" />
              <Button size="sm" type="submit" disabled={!reply.trim() || busy}>Post</Button>
            </form>
          ) : null}
          {error ? <p className="mt-1 text-xs text-ig-error">{error}</p> : null}
        </div>
      </div>
    </li>
  );
}
