"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MAX_CONNECTED_ACCOUNTS } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { Button, ErrorNote, Spinner } from "@/components/ui";
import { post, useApi } from "@/lib/api";

interface Option { igUserId: string; username: string; name: string | null; pageName: string; avatarUrl: string | null }

/** After Meta login: pick which linked Instagram accounts (max 3) join the hub. */
export function ConnectScreen() {
  const router = useRouter();
  const options = useApi<{ options: Option[] }>("/auth/meta/options");
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await post("/auth/meta/select", { igUserIds: chosen });
      router.push("/settings");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar variant="compact" back="/settings" title="Choose accounts" />
      <p className="px-4 pt-4 text-sm text-ig-text-secondary">These professional Instagram accounts are linked to Pages you manage. Pick up to {MAX_CONNECTED_ACCOUNTS}.</p>
      {options.error ? <ErrorNote message={options.error} /> : null}
      {!options.data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : options.data.options.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-ig-text-secondary">
          No linked Instagram accounts found. In Instagram → Settings → Business tools, connect the account to a Facebook Page, then try again.
        </div>
      ) : (
        <ul className="mt-2">
          {options.data.options.map((o) => {
            const on = chosen.includes(o.igUserId);
            return (
              <li key={o.igUserId}>
                <button
                  type="button"
                  onClick={() => setChosen((c) => (on ? c.filter((x) => x !== o.igUserId) : c.length < MAX_CONNECTED_ACCOUNTS ? [...c, o.igUserId] : c))}
                  className="ig-divider flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Avatar name={o.name ?? o.username} src={o.avatarUrl} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">@{o.username}</span>
                    <span className="block truncate text-xs text-ig-text-secondary">Page: {o.pageName}</span>
                  </span>
                  <span className={`size-5 rounded-full border ${on ? "border-[6px] border-ig-primary" : "border-ig-separator"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? <ErrorNote message={error} /> : null}
      <div className="px-4 py-4">
        <Button block size="lg" disabled={chosen.length === 0 || busy} onClick={() => void save()}>{busy ? <Spinner /> : `Connect ${chosen.length || ""} account${chosen.length === 1 ? "" : "s"}`}</Button>
      </div>
    </>
  );
}
