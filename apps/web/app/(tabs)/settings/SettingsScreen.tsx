"use client";

import { useSearchParams } from "next/navigation";
import { BellRing, Plus, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { AccountAccent, AccountNotificationPrefs, ConnectedAccount, NotificationKind, QuietHours } from "@ig-focus-hub/shared";
import { ANTI_SCROLL_RULES, AVAILABILITY_TEXT, FEATURE_MATRIX, MAX_CONNECTED_ACCOUNTS } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { Button, ErrorNote, Row, SectionTitle, Sheet, Toggle } from "@/components/ui";
import { ACCENT_CLASS } from "@/lib/accounts";
import { API_URL, del, patch, put, useApi } from "@/lib/api";
import { enablePush, isStandalone, pushStatus, type PushStatus } from "@/lib/push";

const KIND_TEXT: Record<NotificationKind, string> = {
  new_dm: "New DMs",
  sent_reel: "Sent Reel alerts",
  reaction: "Reaction alerts",
  comment: "Comments",
  mention: "Mentions",
  publish_result: "Publish results",
};

const STATUS_CLASS: Record<string, string> = {
  ready: "text-ig-success",
  custom: "text-ig-primary",
  meta_dependent: "text-accent-orange",
  not_available: "text-ig-error",
};

const subscribeNoop = () => () => {};

export function SettingsScreen() {
  const params = useSearchParams();
  const accounts = useApi<{ accounts: ConnectedAccount[]; max: number }>("/accounts");
  const notif = useApi<{ quietHours: QuietHours; prefs: AccountNotificationPrefs[]; vapidPublicKey: string | null; pushConfigured: boolean }>("/settings/notifications");
  const me = useApi<{ user: { email: string } | null; mock: boolean }>("/auth/me");
  const [editing, setEditing] = useState<ConnectedAccount | null>(null);
  const observedPush = useSyncExternalStore(subscribeNoop, pushStatus, () => "prompt" as PushStatus);
  const installed = useSyncExternalStore(subscribeNoop, isStandalone, () => true);
  const [pushOverride, setPush] = useState<PushStatus | null>(null);
  const push = pushOverride ?? observedPush;
  const [pushError, setPushError] = useState<string | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const list = accounts.data?.accounts ?? [];
  const connectedMsg = params.get("connected");
  const oauthError = params.get("error");

  async function saveAccount(id: string, body: { label?: string; accent?: AccountAccent }) {
    const updated = await patch<ConnectedAccount>(`/accounts/${id}`, body);
    accounts.mutate((prev) => (prev ? { ...prev, accounts: prev.accounts.map((a) => (a.id === id ? updated : a)) } : prev));
    setEditing(updated);
  }
  async function disconnect(id: string) {
    if (!confirm("Disconnect this account? Stored tokens are deleted.")) return;
    await del(`/accounts/${id}`);
    accounts.reload();
    setEditing(null);
  }
  async function setQuiet(q: QuietHours) {
    notif.mutate((prev) => (prev ? { ...prev, quietHours: q } : prev));
    await put("/settings/quiet-hours", q);
  }
  async function setPrefs(p: AccountNotificationPrefs) {
    notif.mutate((prev) => (prev ? { ...prev, prefs: prev.prefs.map((x) => (x.accountId === p.accountId ? p : x)) } : prev));
    await put("/settings/notifications/account", p);
  }
  async function onEnablePush() {
    setPushError(null);
    if (!notif.data?.vapidPublicKey) {
      setPushError("Push isn't configured on the server yet. Run `pnpm --filter @ig-focus-hub/api vapid` and fill the VAPID keys in .env.");
      return;
    }
    if (!isStandalone() && /iPhone|iPad/.test(navigator.userAgent)) {
      setPushError("On iPhone, first add IG Focus Hub to your Home Screen (Share → Add to Home Screen), then enable alerts from the installed app.");
      return;
    }
    try {
      setPush(await enablePush(notif.data.vapidPublicKey));
    } catch (e) {
      setPushError((e as Error).message);
    }
  }

  return (
    <>
      <TopBar title="Settings" subtitle={me.data?.mock ? "Demo mode · fixture data" : me.data?.user?.email} />
      {connectedMsg === "mock" ? <ErrorNote message="Demo mode: Meta login is skipped. Set MOCK_META=0 and Meta app credentials to connect real accounts." /> : null}
      {oauthError ? <ErrorNote message={`Meta login failed: ${oauthError}`} /> : null}

      {!installed ? (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-ig border border-ig-separator bg-ig-bg-secondary px-3 py-3">
          <Smartphone size={20} className="mt-0.5 shrink-0 text-ig-text-secondary" />
          <div className="text-sm">
            <p className="font-semibold">Install to your Home Screen</p>
            <p className="mt-0.5 text-xs text-ig-text-secondary">
              No App Store needed. iPhone: Safari → Share → <strong>Add to Home Screen</strong>. Android: Chrome → menu → <strong>Install app</strong>. Push alerts work from the installed app.
            </p>
          </div>
        </div>
      ) : null}

      <SectionTitle right={<span className="text-xs text-ig-text-secondary">{list.length}/{accounts.data?.max ?? MAX_CONNECTED_ACCOUNTS}</span>}>Instagram accounts</SectionTitle>
      <ul>
        {list.map((a) => (
          <li key={a.id}>
            <Row
              onClick={() => setEditing(a)}
              title={<span className="flex items-center gap-3"><Avatar name={a.displayName} src={a.avatarUrl} size={44} accent={a.accent} /><span><span className="block font-semibold">@{a.username}</span><span className="block text-xs text-ig-text-secondary">{a.label} · {a.status === "active" ? "Connected" : a.status === "needs_reauth" ? "Needs reconnect" : "Disconnected"}</span></span></span>}
              right={<span className={`size-3 rounded-full ${ACCENT_CLASS[a.accent]}`} />}
            />
          </li>
        ))}
      </ul>
      {list.length < (accounts.data?.max ?? MAX_CONNECTED_ACCOUNTS) ? (
        <div className="px-4 py-3">
          <a href={`${API_URL}/auth/meta/start`} className="inline-flex h-9 items-center gap-2 rounded-ig bg-ig-primary px-4 text-sm font-semibold text-white"><Plus size={16} /> Connect Instagram account</a>
          <p className="mt-2 text-xs text-ig-text-secondary">Uses Facebook Login. The professional Instagram account must be linked to a Facebook Page; this is what unlocks the Audio API.</p>
        </div>
      ) : null}

      <SectionTitle>Notifications</SectionTitle>
      <div className="px-4">
        <div className="flex items-center justify-between rounded-ig border border-ig-separator px-3 py-3">
          <span className="flex items-center gap-2 text-sm"><BellRing size={18} /> Push alerts on this device <span className="block text-xs text-ig-text-secondary">{push === "granted" ? "Enabled" : push === "denied" ? "Blocked in browser settings" : push === "unsupported" ? "Not supported here" : "Off"}</span></span>
          {push !== "granted" && push !== "unsupported" ? <Button size="sm" onClick={() => void onEnablePush()}>Enable</Button> : null}
        </div>
        {pushError ? <p className="mt-2 text-xs text-ig-error">{pushError}</p> : null}
      </div>
      {notif.data ? (
        <>
          <div className="mt-3 px-4">
            <div className="rounded-ig border border-ig-separator">
              <label className="flex items-center justify-between px-3 py-3 text-sm">
                <span>Quiet hours <span className="block text-xs text-ig-text-secondary">Suppress normal alerts between these times</span></span>
                <Toggle checked={notif.data.quietHours.enabled} onChange={(v) => void setQuiet({ ...notif.data!.quietHours, enabled: v })} label="Quiet hours" />
              </label>
              {notif.data.quietHours.enabled ? (
                <div className="flex items-center gap-3 border-t border-ig-separator-elevated px-3 py-3 text-sm">
                  <input type="time" value={notif.data.quietHours.start} onChange={(e) => void setQuiet({ ...notif.data!.quietHours, start: e.target.value })} className="rounded-ig border border-ig-separator bg-transparent px-2 py-1" />
                  <span className="text-ig-text-secondary">to</span>
                  <input type="time" value={notif.data.quietHours.end} onChange={(e) => void setQuiet({ ...notif.data!.quietHours, end: e.target.value })} className="rounded-ig border border-ig-separator bg-transparent px-2 py-1" />
                </div>
              ) : null}
              <label className="flex items-center justify-between border-t border-ig-separator-elevated px-3 py-3 text-sm">
                <span>Let priority contacts through</span>
                <Toggle checked={notif.data.quietHours.allowPriorityContacts} onChange={(v) => void setQuiet({ ...notif.data!.quietHours, allowPriorityContacts: v })} label="Priority contacts" />
              </label>
            </div>
          </div>
          {notif.data.prefs.map((p) => {
            const acc = list.find((a) => a.id === p.accountId);
            if (!acc) return null;
            return (
              <div key={p.accountId} className="mt-3 px-4">
                <div className="rounded-ig border border-ig-separator">
                  <label className="flex items-center justify-between px-3 py-3 text-sm">
                    <span className="flex items-center gap-2"><Avatar name={acc.displayName} src={acc.avatarUrl} size={24} accent={acc.accent} /> @{acc.username}</span>
                    <Toggle checked={p.enabled} onChange={(v) => void setPrefs({ ...p, enabled: v })} label={`Alerts for ${acc.username}`} />
                  </label>
                  {p.enabled ? (
                    <div className="divide-y divide-ig-separator-elevated border-t border-ig-separator-elevated px-3">
                      {(Object.keys(KIND_TEXT) as NotificationKind[]).map((k) => (
                        <label key={k} className="flex items-center justify-between py-2.5 text-sm">
                          {KIND_TEXT[k]}
                          <Toggle checked={p.kinds[k] !== false} onChange={(v) => void setPrefs({ ...p, kinds: { ...p.kinds, [k]: v } })} label={KIND_TEXT[k]} />
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </>
      ) : null}

      <SectionTitle>About this app</SectionTitle>
      <Row title="What works, what depends on Meta" subtitle="Feature availability matrix" onClick={() => setMatrixOpen(true)} />
      <div className="px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-ig-text-secondary">Anti-doomscrolling rules (non-negotiable)</p>
        <ul className="space-y-1 text-xs text-ig-text-secondary">
          {ANTI_SCROLL_RULES.map((r) => <li key={r}>• {r}</li>)}
        </ul>
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Account">
        {editing ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar name={editing.displayName} src={editing.avatarUrl} size={80} accent={editing.accent} />
              <p className="text-base font-semibold">@{editing.username}</p>
              <p className="text-xs text-ig-text-secondary">Page {editing.pageId} · IG {editing.igUserId}</p>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Short label</span>
              <input defaultValue={editing.label} maxLength={24} onBlur={(e) => e.target.value && e.target.value !== editing.label && void saveAccount(editing.id, { label: e.target.value })} className="w-full rounded-ig border border-ig-separator bg-transparent px-3 py-2 text-sm outline-none" />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">Accent color</p>
              <div className="flex gap-3">
                {(Object.keys(ACCENT_CLASS) as AccountAccent[]).map((c) => (
                  <button key={c} type="button" aria-label={c} onClick={() => void saveAccount(editing.id, { accent: c })} className={`size-9 rounded-full ${ACCENT_CLASS[c]} ${editing.accent === c ? "ring-2 ring-ig-text ring-offset-2 ring-offset-ig-bg" : ""}`} />
                ))}
              </div>
            </div>
            <Button block variant="danger" onClick={() => void disconnect(editing.id)}>Disconnect account</Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={matrixOpen} onClose={() => setMatrixOpen(false)} title="Feature availability">
        <ul className="divide-y divide-ig-separator-elevated">
          {FEATURE_MATRIX.map((f) => (
            <li key={f.key} className="flex items-start gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{f.capability}</p>
                <p className="text-xs text-ig-text-secondary">{f.description}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold ${STATUS_CLASS[f.status]}`}>{AVAILABILITY_TEXT[f.status]}</span>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
