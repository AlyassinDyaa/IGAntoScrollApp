"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ConnectedAccount } from "@ig-focus-hub/shared";
import { Avatar } from "./Avatar";
import { Sheet } from "./ui";

/**
 * The sending/publishing account is always visible. Spec: show it immediately above
 * the composer and the Publish button.
 */
export function AccountPicker({ accounts, value, onChange, label = "Account" }: { accounts: ConnectedAccount[]; value: string | null; onChange: (id: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const current = accounts.find((a) => a.id === value) ?? null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-ig border border-ig-separator px-3 py-2 text-left">
        {current ? <Avatar name={current.displayName} src={current.avatarUrl} size={32} accent={current.accent} /> : <span className="size-8 rounded-full bg-ig-bg-highlight" />}
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-ig-text-secondary">{label}</span>
          <span className="block truncate text-sm font-semibold">{current ? `@${current.username}` : "Choose an account"}</span>
        </span>
        <ChevronDown size={18} className="text-ig-text-secondary" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <ul>
          {accounts.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
                className="ig-divider flex w-full items-center gap-3 py-3 text-left"
              >
                <Avatar name={a.displayName} src={a.avatarUrl} size={44} accent={a.accent} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">@{a.username}</span>
                  <span className="block truncate text-xs text-ig-text-secondary">{a.label}{a.status !== "active" ? " · needs reconnect" : ""}</span>
                </span>
                {a.id === value ? <span className="size-5 rounded-full border-[6px] border-ig-primary" /> : <span className="size-5 rounded-full border border-ig-separator" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
