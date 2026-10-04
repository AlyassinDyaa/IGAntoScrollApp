"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { ConnectedAccount, Conversation, Message } from "@ig-focus-hub/shared";
import { post, useApi } from "@/lib/api";

/**
 * Sent-Reels-only viewer. Plays exactly one Reel that someone sent in a DM.
 * No swipe-up, no recommendations, no Explore. Finishing returns to the chat.
 */
export function ReelViewer({ messageId, conversationId }: { messageId: string; conversationId: string | null }) {
  const thread = useApi<{ conversation: Conversation; account: ConnectedAccount | null; messages: Message[] }>(conversationId ? `/inbox/conversations/${conversationId}` : null);
  const [reacted, setReacted] = useState(false);
  const message = thread.data?.messages.find((m) => m.id === messageId) ?? null;
  const reel = message?.attachments.find((a) => a.kind === "reel" || a.kind === "post") ?? null;
  const backHref = conversationId ? `/inbox/${conversationId}` : "/inbox";
  const sender = thread.data?.conversation.participant;

  async function react() {
    if (!thread.data?.account || !message) return;
    await post("/inbox/reactions", { accountId: thread.data.account.id, messageId: message.id, emoji: "❤️", action: reacted ? "unreact" : "react" }).catch(() => undefined);
    setReacted((v) => !v);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-black text-white" style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}>
      <header className="flex h-11 items-center px-3">
        <Link href={backHref} aria-label="Back to DM" className="flex size-9 items-center justify-center">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold">Sent Reel</p>
          {sender ? <p className="text-[11px] text-white/60">from {sender.name ?? sender.username}</p> : null}
        </div>
        <div className="size-9" />
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4">
        <div className="flex aspect-[9/16] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#1a1a1a] text-center">
          {reel?.url ? (
            <video src={reel.url} controls autoPlay playsInline loop className="size-full object-contain" />
          ) : reel?.permalink ? (
            <div className="px-6">
              <div className="mx-auto mb-4 size-10 rounded-sm border-2 border-white" />
              <p className="text-sm font-semibold">Only the Reel sent to you</p>
              <p className="mt-2 text-xs text-white/70">Meta did not expose a direct video URL for this Reel, so it opens on Instagram in a separate tab. Come straight back here when you&apos;re done.</p>
              <a href={reel.permalink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-10 items-center gap-2 rounded-ig bg-white px-4 text-sm font-semibold text-black">
                <ExternalLink size={16} /> Open this Reel
              </a>
            </div>
          ) : thread.loading ? (
            <p className="text-xs text-white/60">Loading…</p>
          ) : (
            <p className="px-6 text-xs text-white/60">This message has no shared Reel.</p>
          )}
        </div>
      </div>

      <div className="mx-auto mb-4 flex w-full max-w-md items-center justify-around rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">
        <button type="button" onClick={() => void react()} className="inline-flex items-center gap-1.5">
          <Heart size={18} fill={reacted ? "#ff3040" : "none"} color={reacted ? "#ff3040" : "white"} /> React
        </button>
        <Link href={backHref} className="inline-flex items-center gap-1.5">
          <MessageCircle size={18} /> Reply
        </Link>
        <Link href={backHref} className="inline-flex items-center gap-1.5">
          <ArrowLeft size={18} /> Back to DM
        </Link>
      </div>
      <p className="pb-3 text-center text-[11px] text-white/40">No next Reel. No recommendations.</p>
    </div>
  );
}
