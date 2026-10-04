"use client";

import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  onBack?: () => void;
  left?: ReactNode;
  right?: ReactNode;
  /** Instagram inbox header: tappable title with a chevron (account switcher). */
  onTitleClick?: () => void;
  /** Large title (IG inbox style) vs centered compact title (IG thread style). */
  variant?: "large" | "compact";
}

export function TopBar({ title, subtitle, back, onBack, left, right, onTitleClick, variant = "large" }: Props) {
  const backBtn = back ? (
    <Link href={back} aria-label="Back" className="-ml-1 mr-1 flex size-9 items-center justify-center active:opacity-60">
      <ChevronLeft size={28} strokeWidth={2} />
    </Link>
  ) : onBack ? (
    <button type="button" onClick={onBack} aria-label="Back" className="-ml-1 mr-1 flex size-9 items-center justify-center active:opacity-60">
      <ChevronLeft size={28} strokeWidth={2} />
    </button>
  ) : left ? (
    <div className="mr-2 flex items-center">{left}</div>
  ) : null;

  const titleNode = (
    <>
      <h1 className={`truncate ${variant === "large" ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"}`}>
        {title}
        {onTitleClick ? <ChevronDown size={18} strokeWidth={2.5} className="ml-1 inline-block align-middle" /> : null}
      </h1>
      {subtitle ? <p className="truncate text-xs text-ig-text-secondary">{subtitle}</p> : null}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-ig-separator-elevated bg-ig-bg/95 backdrop-blur supports-[backdrop-filter]:bg-ig-bg/80" style={{ paddingTop: "var(--safe-top)" }}>
      <div className={`flex h-[var(--topbar-height)] items-center px-3 ${variant === "large" ? "md:h-14" : ""}`}>
        {backBtn}
        <div className={`min-w-0 flex-1 ${variant === "compact" ? "text-center" : ""}`}>
          {onTitleClick ? (
            <button type="button" onClick={onTitleClick} className="min-w-0 max-w-full text-left active:opacity-60">{titleNode}</button>
          ) : (
            titleNode
          )}
        </div>
        {right ? <div className="ml-2 flex shrink-0 items-center gap-3">{right}</div> : (back || onBack) && variant === "compact" ? <div className="size-9" /> : null}
      </div>
    </header>
  );
}
