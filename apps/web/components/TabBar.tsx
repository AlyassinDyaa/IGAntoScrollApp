"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, LayoutGrid, Send, SquarePlus } from "lucide-react";
import type { ConnectedAccount } from "@ig-focus-hub/shared";
import { useApi } from "@/lib/api";
import { Avatar } from "./Avatar";

/** Only productive destinations. No Home, Explore or Reels tab by design. */
export const TABS = [
  { href: "/inbox", label: "Inbox", Icon: Send },
  { href: "/create", label: "Create", Icon: SquarePlus },
  { href: "/business", label: "Business", Icon: ChartNoAxesColumn },
  { href: "/content", label: "Content", Icon: LayoutGrid },
] as const;

function useFirstAccount(): ConnectedAccount | null {
  const accounts = useApi<{ accounts: ConnectedAccount[] }>("/accounts");
  return accounts.data?.accounts[0] ?? null;
}

/** Instagram's last tab is your avatar; here it opens Settings. */
function AccountTab({ active, withLabel }: { active: boolean; withLabel?: boolean }) {
  const account = useFirstAccount();
  return (
    <>
      <span className={`rounded-full ${active ? "ring-2 ring-ig-text ring-offset-2 ring-offset-ig-bg" : ""}`}>
        {account ? <Avatar name={account.displayName} src={account.avatarUrl} size={24} accent={account.accent} /> : <span className="block size-6 rounded-full bg-ig-bg-highlight" />}
      </span>
      {withLabel ? <span className={active ? "font-bold" : ""}>Settings</span> : null}
    </>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-ig-separator bg-ig-bg md:hidden" style={{ paddingBottom: "var(--safe-bottom)" }}>
      <ul className="flex h-[var(--tabbar-height)] items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} aria-label={label} className="flex h-full items-center justify-center active:opacity-60">
                <Icon size={26} strokeWidth={active ? 2.5 : 1.75} fill={active && href === "/inbox" ? "currentColor" : "none"} />
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Link href="/settings" aria-current={settingsActive ? "page" : undefined} aria-label="Settings" className="flex h-full items-center justify-center active:opacity-60">
            <AccountTab active={settingsActive} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** Desktop: Instagram-style left rail with labels. */
export function SideNav() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith("/settings");
  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-[244px] md:flex-col md:border-r md:border-ig-separator md:bg-ig-bg md:px-3 md:pt-8 md:pb-5">
      <Link href="/inbox" className="mb-6 px-3 text-xl font-semibold tracking-tight">
        <span className="ig-gradient-text">IG Focus Hub</span>
      </Link>
      <ul className="flex flex-col gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className="flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-colors hover:bg-ig-bg-highlight">
                <Icon size={24} strokeWidth={active ? 2.5 : 1.75} />
                <span className={active ? "font-bold" : ""}>{label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link href="/settings" aria-current={settingsActive ? "page" : undefined} className="flex items-center gap-4 rounded-lg px-3 py-3 text-base transition-colors hover:bg-ig-bg-highlight">
            <AccountTab active={settingsActive} withLabel />
          </Link>
        </li>
      </ul>
      <p className="mt-auto px-3 text-xs text-ig-text-secondary">No feed. No Explore. Just the work.</p>
    </aside>
  );
}
