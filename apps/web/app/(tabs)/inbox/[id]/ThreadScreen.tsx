"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Heart, Info, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ConnectedAccount, Conversation, CrmLabel, Message, SavedReply } from "@ig-focus-hub/shared";
import { CRM_LABEL_TEXT } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { AccountBadge, Button, Chip, ChipRow, ErrorNote, Sheet, Spinner, Toggle } from "@/components/ui";
import { patch, post, useApi } from "@/lib/api";

interface ThreadResponse {
  conversation: Conversation;
  account: ConnectedAccount | null;
  messages: Message[];
  privateNote: string | null;
}

export function ThreadScreen({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const thread = useApi<ThreadResponse>(`/inbox/conversations/${conversationId}`);
  const replies = useApi<{ replies: SavedReply[] }>("/inbox/saved-replies");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [details, setDetails] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCount = thread.data?.messages.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount]);

  const data = thread.data;
  const conv = data?.conversation;
  const account = data?.account;
  const name = conv?.participant.name ?? conv?.participant.username ?? "";

  async function send() {
    if (!conv || !account || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await post<{ message: Message }>("/inbox/messages", { accountId: account.id, conversationId: conv.id, text: text.trim() });
      thread.mutate((prev) => (prev ? { ...prev, messages: [...prev.messages, res.message], conversation: { ...prev.conversation, needsReply: false } } : prev));
      setText("");
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function react(message: Message) {
    if (!account) return;
    const mine = message.reactions.some((r) => r.fromMe);
    try {
      await post("/inbox/reactions", { accountId: account.id, messageId: message.id, emoji: "❤️", action: mine ? "unreact" : "react" });
      thread.mutate((prev) =>
        prev
          ? { ...prev, messages: prev.messages.map((m) => (m.id === message.id ? { ...m, reactions: mine ? m.reactions.filter((r) => !r.fromMe) : [...m.reactions, { emoji: "❤️", fromMe: true }] } : m)) }
          : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function update(patchBody: Partial<Conversation> & { privateNote?: string | null }) {
    if (!conv) return;
    const updated = await patch<Conversation>(`/inbox/conversations/${conv.id}`, patchBody);
    thread.mutate((prev) => (prev ? { ...prev, conversation: updated, privateNote: patchBody.privateNote !== undefined ? patchBody.privateNote : prev.privateNote } : prev));
  }

  return (
    <div className="flex min-h-dvh flex-col md:min-h-0">
      <TopBar
        variant="compact"
        back="/inbox"
        title={
          <span className="inline-flex items-center gap-2">
            {conv ? <Avatar name={name} src={conv.participant.avatarUrl} size={28} accent={account?.accent ?? null} /> : null}
            {name}
          </span>
        }
        subtitle={conv ? `@${conv.participant.username}` : undefined}
        right={
          <button type="button" onClick={() => setDetails(true)} aria-label="Conversation details" className="flex size-9 items-center justify-center">
            <Info size={24} strokeWidth={1.75} />
          </button>
        }
      />

      {thread.error ? <ErrorNote message={thread.error} /> : null}
      {!data ? (
        <div className="flex flex-1 justify-center py-10"><Spinner /></div>
      ) : (
        <div className="flex-1 space-y-1 px-4 py-4">
          {data.messages.map((m, i) => (
            <Bubble
              key={m.id}
              message={m}
              conversationId={conversationId}
              showTime={i === 0 || new Date(m.sentAt).getTime() - new Date(data.messages[i - 1]!.sentAt).getTime() > 30 * 60_000}
              onReact={() => react(m)}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="sticky bottom-[calc(var(--tabbar-height)+var(--safe-bottom))] border-t border-ig-separator-elevated bg-ig-bg md:bottom-0">
        {sent ? (
          <div className="flex items-center justify-between bg-ig-bg-secondary px-4 py-2 text-xs">
            <span className="text-ig-text-secondary">Reply sent.</span>
            <Link href="/inbox" className="font-semibold text-ig-primary">Back to Inbox</Link>
          </div>
        ) : null}
        {replies.data?.replies.length ? (
          <ChipRow>
            {replies.data.replies.map((r) => (
              <Chip key={r.id} onClick={() => setText((t) => (t ? `${t} ${r.body}` : r.body))}>{r.title}</Chip>
            ))}
          </ChipRow>
        ) : null}
        {account ? (
          <div className="flex items-center gap-2 px-4 pb-1 text-xs text-ig-text-secondary">
            <AccountBadge account={account} prefix="Replying as " />
          </div>
        ) : null}
        {error ? <ErrorNote message={error} /> : null}
        <form
          className="flex items-center gap-2 px-4 pt-1 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div className="flex h-11 flex-1 items-center rounded-pill border border-ig-separator px-4">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message..." className="w-full bg-transparent text-sm outline-none placeholder:text-ig-text-secondary" disabled={!account} />
            <button type="submit" disabled={!text.trim() || sending || !account} className="ml-2 text-sm font-semibold text-ig-primary disabled:opacity-40">
              {sending ? "…" : "Send"}
            </button>
          </div>
        </form>
      </div>

      <Sheet open={details} onClose={() => setDetails(false)} title="Details">
        {conv ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar name={name} src={conv.participant.avatarUrl} size={80} accent={account?.accent ?? null} />
              <p className="text-base font-semibold">{name}</p>
              <p className="text-xs text-ig-text-secondary">@{conv.participant.username}{account ? ` · via @${account.username}` : ""}</p>
            </div>
            <label className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm"><Star size={18} /> Favorite</span>
              <Toggle checked={conv.favorite} onChange={(v) => void update({ favorite: v })} label="Favorite" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Priority contact <span className="block text-xs text-ig-text-secondary">Always notify, even in quiet hours</span></span>
              <Toggle checked={conv.priority} onChange={(v) => void update({ priority: v })} label="Priority" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Mute locally</span>
              <Toggle checked={conv.mutedLocally} onChange={(v) => void update({ mutedLocally: v })} label="Mute" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Needs reply</span>
              <Toggle checked={conv.needsReply} onChange={(v) => void update({ needsReply: v })} label="Needs reply" />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">Labels</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CRM_LABEL_TEXT) as CrmLabel[]).map((l) => (
                  <Chip key={l} active={conv.labels.includes(l)} onClick={() => void update({ labels: conv.labels.includes(l) ? conv.labels.filter((x) => x !== l) : [...conv.labels, l] })}>
                    {CRM_LABEL_TEXT[l]}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Private note</p>
              <textarea
                defaultValue={data?.privateNote ?? ""}
                onBlur={(e) => void update({ privateNote: e.target.value || null })}
                placeholder="Only you can see this."
                rows={3}
                className="w-full rounded-ig border border-ig-separator bg-transparent p-3 text-sm outline-none"
              />
            </div>
            <Button variant="secondary" block onClick={() => router.push("/inbox")}>Back to Inbox</Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function Bubble({ message: m, conversationId, showTime, onReact }: { message: Message; conversationId: string; showTime: boolean; onReact: () => void }) {
  const reel = m.attachments.find((a) => a.kind === "reel" || a.kind === "post");
  const media = m.attachments.find((a) => a.kind === "image" || a.kind === "video");
  return (
    <div>
      {showTime ? <p className="py-3 text-center text-[11px] text-ig-text-secondary">{new Date(m.sentAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", weekday: "short" })}</p> : null}
      <div className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
        <div className="group relative max-w-[75%]">
          {reel ? (
            <Link href={`/reel/${m.id}?c=${conversationId}`} className="flex w-56 flex-col overflow-hidden rounded-2xl border border-ig-separator bg-ig-bg-secondary">
              <div className="flex aspect-[4/5] items-center justify-center bg-black text-white">
                <Film size={36} strokeWidth={1.5} />
              </div>
              <div className="px-3 py-2 text-xs">
                <p className="font-semibold">{reel.kind === "reel" ? "Sent you a Reel" : "Shared a post"}</p>
                <p className="text-ig-text-secondary">Opens only this {reel.kind}. No feed.</p>
              </div>
            </Link>
          ) : media ? (
            <div className="w-56 overflow-hidden rounded-2xl border border-ig-separator">
              {media.kind === "video" ? (
                <video src={media.url ?? undefined} controls playsInline className="w-full" />
              ) : media.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt="" className="w-full" />
              ) : null}
            </div>
          ) : null}
          {m.text ? (
            <button type="button" onDoubleClick={onReact} className={`block rounded-[22px] px-4 py-2 text-left text-sm ${m.fromMe ? "bg-ig-bubble-mine text-white" : "bg-ig-bubble-theirs text-ig-text"}`}>
              {m.text}
            </button>
          ) : null}
          {m.attachments.some((a) => a.kind === "unsupported") ? (
            <p className="mt-1 rounded-ig bg-ig-bg-highlight px-3 py-2 text-xs text-ig-text-secondary">Unsupported attachment. Meta did not expose this content to third-party apps.</p>
          ) : null}
          {m.reactions.length ? (
            <span className={`absolute -bottom-3 ${m.fromMe ? "right-2" : "left-2"} rounded-full border border-ig-bg bg-ig-bg-highlight px-1.5 py-0.5 text-xs`}>
              {m.reactions.map((r) => r.emoji).join("")}
            </span>
          ) : null}
          {!m.fromMe ? (
            <button type="button" onClick={onReact} aria-label="React" className="absolute top-1/2 -right-8 -translate-y-1/2 text-ig-text-secondary opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100">
              <Heart size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
