"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesColumn, LayoutGrid, Menu, Send, SquarePlus } from "lucide-react";

/** Only productive destinations. There is no Home, Explore or Reels tab by design. */
export const TABS = [
  { href: "/inbox", label: "Inbox", Icon: Send },
  { href: "/create", label: "Create", Icon: SquarePlus },
  { href: "/business", label: "Business", Icon: ChartNoAxesColumn },
  { href: "/content", label: "Content", Icon: LayoutGrid },
  { href: "/settings", label: "Settings", Icon: Menu },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ig-separator bg-ig-bg md:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="flex h-[var(--tabbar-height)] items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} aria-label={label} className="flex h-full flex-col items-center justify-center gap-0.5">
                <Icon size={24} strokeWidth={active ? 2.5 : 1.75} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop: Instagram-style left rail with labels. */
export function SideNav() {
  const pathname = usePathname();
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
      </ul>
      <p className="mt-auto px-3 text-xs text-ig-text-secondary">No feed. No Explore. Just the work.</p>
    </aside>
  );
}
