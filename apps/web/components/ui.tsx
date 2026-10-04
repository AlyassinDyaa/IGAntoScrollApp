"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { AccountAccent, ConnectedAccount } from "@ig-focus-hub/shared";
import { ACCENT_CLASS } from "@/lib/accounts";
import { Avatar } from "./Avatar";

// ---------------------------------------------------------------- buttons --

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
};

export function Button({ variant = "primary", size = "md", block, className = "", ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-ig font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const sizes = { sm: "h-8 px-3 text-sm", md: "h-9 px-4 text-sm", lg: "h-11 px-5 text-base" }[size];
  const variants = {
    primary: "bg-ig-primary text-white hover:bg-ig-primary-hover",
    secondary: "bg-ig-secondary-button text-ig-text hover:opacity-80",
    ghost: "bg-transparent text-ig-primary hover:text-ig-link",
    danger: "bg-transparent text-ig-error hover:opacity-80",
  }[variant];
  return <button className={`${base} ${sizes} ${variants} ${block ? "w-full" : ""} ${className}`} {...rest} />;
}

// ------------------------------------------------------------------ chips --

export function Chip({ active, children, onClick, className = "" }: { active?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-8 shrink-0 rounded-pill border px-4 text-sm font-semibold transition-colors ${
        active ? "border-ig-text bg-ig-text text-ig-bg" : "border-ig-separator bg-ig-bg text-ig-text hover:bg-ig-bg-highlight"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">{children}</div>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-9 flex-1 rounded-pill text-sm font-semibold transition-colors ${o.value === value ? "bg-ig-text text-ig-bg" : "bg-ig-bg-highlight text-ig-text"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- toggles --

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors ${checked ? "bg-ig-primary" : "bg-ig-separator"}`}
    >
      <span className={`absolute top-[2px] size-[22px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[20px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

// ------------------------------------------------------------------- rows --

export function Row({ title, subtitle, right, onClick, danger }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; onClick?: () => void; danger?: boolean }) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm ${danger ? "text-ig-error" : ""}`}>{title}</div>
        {subtitle ? <div className="mt-0.5 truncate text-xs text-ig-text-secondary">{subtitle}</div> : null}
      </div>
      {right}
    </>
  );
  const cls = "ig-divider flex w-full items-center gap-3 px-4 py-3 text-left";
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-ig-bg-highlight`}>{inner}</button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-2">
      <h2 className="text-sm font-semibold">{children}</h2>
      {right}
    </div>
  );
}

// ----------------------------------------------------------- account bits --

export function AccountDot({ accent, className = "" }: { accent: AccountAccent; className?: string }) {
  return <span aria-hidden className={`inline-block size-2 rounded-full ${ACCENT_CLASS[accent]} ${className}`} />;
}

export function AccountBadge({ account, prefix }: { account: Pick<ConnectedAccount, "username" | "label" | "accent" | "avatarUrl" | "displayName">; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-ig-bg-highlight py-1 pr-3 pl-1 text-xs font-semibold">
      <Avatar name={account.displayName} src={account.avatarUrl} size={18} accent={account.accent} />
      {prefix ? <span className="font-normal text-ig-text-secondary">{prefix}</span> : null}@{account.username}
    </span>
  );
}

// ----------------------------------------------------------------- states --

export function EmptyState({ icon, title, body }: { icon?: ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      {icon ? <div className="mb-3 flex size-16 items-center justify-center rounded-full border-2 border-ig-text">{icon}</div> : null}
      <p className="text-base font-semibold">{title}</p>
      {body ? <p className="mt-1 text-sm text-ig-text-secondary">{body}</p> : null}
    </div>
  );
}

export function EndOfList({ children = "You're all caught up" }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-10 text-center text-ig-text-secondary">
      <span className="flex size-10 items-center justify-center rounded-full border border-ig-separator text-base">✓</span>
      <p className="text-xs">{children}</p>
    </div>
  );
}

export function Spinner() {
  return <span aria-label="Loading" className="inline-block size-5 animate-spin rounded-full border-2 border-ig-separator border-t-ig-text" />;
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="mx-4 my-3 rounded-ig border border-ig-error/40 bg-ig-error/10 px-3 py-2 text-xs text-ig-error">{message}</p>;
}

// ------------------------------------------------------------------ sheet --

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="animate-sheet-up relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-ig-bg md:rounded-2xl" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ig-separator md:hidden" />
        <div className="flex h-11 items-center justify-between border-b border-ig-separator-elevated px-4">
          <span className="text-base font-semibold">{title}</span>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-ig-primary">Done</button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <div className="border-t border-ig-separator-elevated px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
