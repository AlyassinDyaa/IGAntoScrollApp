"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  right?: ReactNode;
  /** Large title (IG inbox style) vs centered compact title (IG thread style). */
  variant?: "large" | "compact";
}

export function TopBar({ title, subtitle, back, right, variant = "large" }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-ig-separator-elevated bg-ig-bg/95 backdrop-blur supports-[backdrop-filter]:bg-ig-bg/80" style={{ paddingTop: "var(--safe-top)" }}>
      <div className={`flex h-[var(--topbar-height)] items-center px-3 ${variant === "large" ? "md:h-14" : ""}`}>
        {back ? (
          <Link href={back} aria-label="Back" className="-ml-1 mr-1 flex size-9 items-center justify-center">
            <ChevronLeft size={28} strokeWidth={2} />
          </Link>
        ) : null}
        <div className={`min-w-0 flex-1 ${variant === "compact" ? "text-center" : ""}`}>
          <h1 className={`truncate ${variant === "large" ? "text-xl font-bold md:text-2xl" : "text-base font-semibold"}`}>{title}</h1>
          {subtitle ? <p className="truncate text-xs text-ig-text-secondary">{subtitle}</p> : null}
        </div>
        {right ? <div className="ml-2 flex shrink-0 items-center gap-2">{right}</div> : back && variant === "compact" ? <div className="size-9" /> : null}
      </div>
    </header>
  );
}
