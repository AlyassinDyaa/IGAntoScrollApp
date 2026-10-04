"use client";

import Link from "next/link";
import { Search, SquarePen } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConnectedAccount, Conversation } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { AccountDot, Chip, ChipRow, EmptyState, EndOfList, ErrorNote, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";

type Filter = "all" | "needs_reply" | string;

export function InboxScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const params = new URLSearchParams();
  if (filter !== "all" && filter !== "needs_reply") params.set("accountId", filter);
  if (filter === "needs_reply") params.set("needsReply", "1");
  if (query.trim()) params.set("q", query.trim());
  const conversations = useApi<{ conversations: Conversation[] }>(`/inbox/conversations?${params.toString()}`);

  const accountById = useMemo(() => new Map((accounts.data?.accounts ?? []).map((a) => [a.id, a])), [accounts.data]);
  const list = conversations.data?.conversations ?? [];
  const unread = list.reduce((n, c) => n + c.unreadCount, 0);

  return (
    <>
      <TopBar
        title="IG Focus Hub"
        subtitle={accounts.data ? `${accounts.data.accounts.length} accounts${unread ? ` · ${unread} unread` : ""}` : undefined}
        right={
          <span title="New conversations are started from Instagram. Meta limits who a business can message first." className="text-ig-text-secondary">
            <SquarePen size={24} strokeWidth={1.75} />
          </span>
        }
      />

      <div className="px-4 pt-3">
        <label className="flex h-9 items-center gap-2 rounded-ig bg-ig-bg-highlight px-3">
          <Search size={16} className="text-ig-text-secondary" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-ig-text-secondary" />
        </label>
      </div>

      <ChipRow>
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>All</Chip>
        <Chip active={filter === "needs_reply"} onClick={() => setFilter("needs_reply")}>Needs reply</Chip>
        {(accounts.data?.accounts ?? []).map((a) => (
          <Chip key={a.id} active={filter === a.id} onClick={() => setFilter(a.id)}>
            <span className="inline-flex items-center gap-1.5">
              <AccountDot accent={a.accent} />
              {a.label}
            </span>
          </Chip>
        ))}
      </ChipRow>

      {conversations.error ? <ErrorNote message={conversations.error} /> : null}
      {conversations.loading && !conversations.data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : list.length === 0 ? (
        <EmptyState title="No conversations" body={query ? "Try a different search." : "Messages sent to your connected accounts show up here."} />
      ) : (
        <ul>
          {list.map((c) => (
            <ConversationRow key={c.id} conversation={c} account={accountById.get(c.accountId) ?? null} showAccount={filter === "all" || filter === "needs_reply"} />
          ))}
        </ul>
      )}
      {list.length > 0 ? <EndOfList>That&apos;s everything. Nothing else to scroll.</EndOfList> : null}
    </>
  );
}

function ConversationRow({ conversation: c, account, showAccount }: { conversation: Conversation; account: ConnectedAccount | null; showAccount: boolean }) {
  const name = c.participant.name ?? c.participant.username;
  const unread = c.unreadCount > 0;
  return (
    <li>
      <Link href={`/inbox/${c.id}`} className="flex items-center gap-3 px-4 py-2 active:bg-ig-bg-highlight">
        <Avatar name={name} src={c.participant.avatarUrl} size={56} ring={unread} accent={account?.accent ?? null} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`truncate text-sm ${unread ? "font-semibold" : ""}`}>{name}</span>
            {c.priority ? <span title="Priority contact" className="text-[10px]">⭐</span> : null}
            {showAccount && account ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] text-ig-text-secondary">
                <AccountDot accent={account.accent} />
                {account.label}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className={`truncate ${unread ? "font-semibold text-ig-text" : "text-ig-text-secondary"}`}>{c.lastMessagePreview}</span>
            <span className="shrink-0 text-ig-text-secondary">· {timeAgo(c.lastMessageAt)}</span>
          </div>
          {c.labels.length ? (
            <div className="mt-1 flex gap-1">
              {c.labels.slice(0, 2).map((l) => (
                <span key={l} className="rounded bg-ig-bg-highlight px-1.5 py-0.5 text-[10px] font-semibold text-ig-text-secondary">{l.replace(/_/g, " ")}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex w-5 shrink-0 justify-end">
          {unread ? <span className="size-2 rounded-full bg-ig-primary" /> : c.needsReply ? <span title="Needs reply" className="size-2 rounded-full border border-ig-text-secondary" /> : null}
        </div>
      </Link>
    </li>
  );
}
