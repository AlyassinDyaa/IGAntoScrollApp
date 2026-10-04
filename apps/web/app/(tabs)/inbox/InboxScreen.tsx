"use client";

import Link from "next/link";
import { Camera, Search, SquarePen } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConnectedAccount, Conversation } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { AccountDot, Chip, ChipRow, EmptyState, EndOfList, ErrorNote, Sheet, Spinner } from "@/components/ui";
import { useApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";

type Tab = "all" | "needs_reply" | "favorites";

/**
 * Instagram Direct inbox, minus Notes and Requests. The title is the account switcher,
 * exactly like tapping your username at the top of Instagram's inbox.
 */
export function InboxScreen() {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [switcher, setSwitcher] = useState(false);
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  const params = new URLSearchParams();
  if (accountId) params.set("accountId", accountId);
  if (tab === "needs_reply") params.set("needsReply", "1");
  if (query.trim()) params.set("q", query.trim());
  const conversations = useApi<{ conversations: Conversation[] }>(`/inbox/conversations?${params.toString()}`);

  const accountList = useMemo(() => accounts.data?.accounts ?? [], [accounts.data]);
  const accountById = useMemo(() => new Map(accountList.map((a) => [a.id, a])), [accountList]);
  const current = accountId ? accountById.get(accountId) ?? null : null;
  const list = (conversations.data?.conversations ?? []).filter((c) => tab !== "favorites" || c.favorite);
  const unread = list.reduce((n, c) => n + c.unreadCount, 0);

  return (
    <>
      <TopBar
        title={current ? current.username : "All accounts"}
        subtitle={accounts.data ? `${accountList.length} accounts${unread ? ` · ${unread} unread` : ""}` : undefined}
        onTitleClick={() => setSwitcher(true)}
        right={
          <span title="Businesses can't start new conversations on Instagram. Customers message you first." className="text-ig-text">
            <SquarePen size={26} strokeWidth={1.75} />
          </span>
        }
      />

      <div className="px-4 pt-3">
        <label className="flex h-9 items-center gap-2 rounded-[10px] bg-ig-bg-highlight px-3">
          <Search size={16} className="text-ig-text-secondary" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-ig-text-secondary" />
        </label>
      </div>

      <ChipRow>
        <Chip active={tab === "all"} onClick={() => setTab("all")}>Primary</Chip>
        <Chip active={tab === "needs_reply"} onClick={() => setTab("needs_reply")}>Needs reply</Chip>
        <Chip active={tab === "favorites"} onClick={() => setTab("favorites")}>Favorites</Chip>
      </ChipRow>

      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <h2 className="text-base font-bold">Messages</h2>
        {current ? <button type="button" onClick={() => setAccountId(null)} className="text-sm font-semibold text-ig-primary">All accounts</button> : null}
      </div>

      {conversations.error ? <ErrorNote message={conversations.error} /> : null}
      {conversations.loading && !conversations.data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : list.length === 0 ? (
        <EmptyState title="No messages" body={query ? "Try a different search." : "Messages sent to your connected accounts show up here."} />
      ) : (
        <ul>
          {list.map((c) => (
            <ConversationRow key={c.id} conversation={c} account={accountById.get(c.accountId) ?? null} showAccount={!current} />
          ))}
        </ul>
      )}
      {list.length > 0 ? <EndOfList>That&apos;s everything. Nothing else to scroll.</EndOfList> : null}

      <Sheet open={switcher} onClose={() => setSwitcher(false)} title="Switch inbox">
        <ul>
          <li>
            <button type="button" onClick={() => { setAccountId(null); setSwitcher(false); }} className="ig-divider flex w-full items-center gap-3 py-3 text-left">
              <span className="flex size-11 items-center justify-center rounded-full bg-ig-bg-highlight text-sm font-semibold">All</span>
              <span className="flex-1 text-sm font-semibold">All accounts</span>
              {!accountId ? <span className="size-5 rounded-full border-[6px] border-ig-primary" /> : <span className="size-5 rounded-full border border-ig-separator" />}
            </button>
          </li>
          {accountList.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => { setAccountId(a.id); setSwitcher(false); }} className="ig-divider flex w-full items-center gap-3 py-3 text-left">
                <Avatar name={a.displayName} src={a.avatarUrl} size={44} accent={a.accent} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.username}</span>
                  <span className="block truncate text-xs text-ig-text-secondary">{a.label}</span>
                </span>
                {accountId === a.id ? <span className="size-5 rounded-full border-[6px] border-ig-primary" /> : <span className="size-5 rounded-full border border-ig-separator" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
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
            {showAccount && account ? <AccountDot accent={account.accent} /> : null}
            <span className={`truncate text-sm ${unread ? "font-semibold" : ""}`}>{name}</span>
            {c.priority ? <span title="Priority contact" className="text-[10px]">⭐</span> : null}
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
        <div className="flex shrink-0 items-center gap-3">
          {unread ? <span className="size-2 rounded-full bg-ig-primary" /> : c.needsReply ? <span title="Needs reply" className="size-2 rounded-full border border-ig-text-secondary" /> : null}
          <Camera size={22} strokeWidth={1.5} className="text-ig-text-secondary" />
        </div>
      </Link>
    </li>
  );
}
