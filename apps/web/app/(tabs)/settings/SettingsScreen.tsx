"use client";

import { useSearchParams } from "next/navigation";
import { BellRing, CircleHelp, Info, MessageSquareText, Moon, Plus, Search, ShieldCheck, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { AccountAccent, AccountNotificationPrefs, ConnectedAccount, NotificationKind, QuietHours, SavedReply } from "@ig-focus-hub/shared";
import { ANTI_SCROLL_RULES, AVAILABILITY_TEXT, FEATURE_MATRIX, MAX_CONNECTED_ACCOUNTS } from "@ig-focus-hub/shared";
import { Avatar } from "@/components/Avatar";
import { TopBar } from "@/components/TopBar";
import { Button, ErrorNote, ListRow, SectionLabel, Sheet, Toggle } from "@/components/ui";
import { ACCENT_CLASS } from "@/lib/accounts";
import { API_URL, del, patch, put, useApi } from "@/lib/api";
import { enablePush, isStandalone, pushStatus, type PushStatus } from "@/lib/push";

const KIND_TEXT: Record<NotificationKind, string> = {
  new_dm: "Messages",
  sent_reel: "Reels sent to you",
  reaction: "Reactions",
  comment: "Comments",
  mention: "Mentions",
  publish_result: "Publishing results",
};

const STATUS_CLASS: Record<string, string> = { ready: "text-ig-success", custom: "text-ig-primary", meta_dependent: "text-accent-orange", not_available: "text-ig-error" };
const subscribeNoop = () => () => {};
type SheetName = "account" | "notifications" | "quiet" | "install" | "replies" | "matrix" | "rules" | "about" | null;

/** Modeled on Instagram's "Settings and activity": search, grouped rows with icons and chevrons. */
export function SettingsScreen() {
  const params = useSearchParams();
  const accounts = useApi<{ accounts: ConnectedAccount[]; max: number }>("/accounts");
  const notif = useApi<{ quietHours: QuietHours; prefs: AccountNotificationPrefs[]; vapidPublicKey: string | null; pushConfigured: boolean }>("/settings/notifications");
  const replies = useApi<{ replies: SavedReply[] }>("/inbox/saved-replies");
  const me = useApi<{ user: { email: string } | null; mock: boolean }>("/auth/me");
  const [sheet, setSheet] = useState<SheetName>(null);
  const [editing, setEditing] = useState<ConnectedAccount | null>(null);
  const [filter, setFilter] = useState("");
  const observedPush = useSyncExternalStore(subscribeNoop, pushStatus, () => "prompt" as PushStatus);
  const [pushOverride, setPush] = useState<PushStatus | null>(null);
  const push = pushOverride ?? observedPush;
  const installed = useSyncExternalStore(subscribeNoop, isStandalone, () => true);
  const [pushError, setPushError] = useState<string | null>(null);

  const list = accounts.data?.accounts ?? [];
  const max = accounts.data?.max ?? MAX_CONNECTED_ACCOUNTS;
  const show = (label: string) => !filter.trim() || label.toLowerCase().includes(filter.trim().toLowerCase());

  async function saveAccount(id: string, body: { label?: string; accent?: AccountAccent }) {
    const updated = await patch<ConnectedAccount>(`/accounts/${id}`, body);
    accounts.mutate((prev) => (prev ? { ...prev, accounts: prev.accounts.map((a) => (a.id === id ? updated : a)) } : prev));
    setEditing(updated);
  }
  async function disconnect(id: string) {
    if (!confirm("Remove this account from the hub? Stored tokens are deleted.")) return;
    await del(`/accounts/${id}`);
    accounts.reload();
    setSheet(null);
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
    if (!notif.data?.vapidPublicKey) return setPushError("Push isn't configured on the server yet (VAPID keys). See docs/DEPLOY.md.");
    if (!isStandalone() && /iPhone|iPad/.test(navigator.userAgent)) return setPushError("On iPhone, add IG Focus Hub to your Home Screen first, then enable alerts from the installed app.");
    try {
      setPush(await enablePush(notif.data.vapidPublicKey));
    } catch (e) {
      setPushError((e as Error).message);
    }
  }

  const connected = params.get("connected");
  const oauthError = params.get("error");

  return (
    <>
      <TopBar variant="compact" back="/inbox" title="Settings and activity" />
      {connected === "mock" ? <ErrorNote message="Demo mode: Meta login is skipped. Real accounts need the Meta app credentials from docs/META_SETUP.md." /> : null}
      {oauthError ? <ErrorNote message={`Meta login failed: ${oauthError}`} /> : null}

      <div className="px-4 pt-3">
        <label className="flex h-9 items-center gap-2 rounded-[10px] bg-ig-bg-highlight px-3">
          <Search size={16} className="text-ig-text-secondary" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-ig-text-secondary" />
        </label>
      </div>

      <SectionLabel>Your accounts · {list.length}/{max}</SectionLabel>
      {list.filter((a) => show(a.username) || show(a.label)).map((a) => (
        <ListRow
          key={a.id}
          icon={<Avatar name={a.displayName} src={a.avatarUrl} size={28} accent={a.accent} />}
          label={<span><span className="font-semibold">{a.username}</span><span className="block text-xs text-ig-text-secondary">{a.label} · {a.status === "active" ? "Connected" : a.status === "needs_reauth" ? "Needs reconnect" : "Disconnected"}</span></span>}
          right={<span className={`size-2.5 rounded-full ${ACCENT_CLASS[a.accent]}`} />}
          onClick={() => { setEditing(a); setSheet("account"); }}
        />
      ))}
      {list.length < max && show("add account") ? (
        <ListRow icon={<Plus size={22} />} label={<span className="text-ig-primary">Add Instagram account</span>} href={`${API_URL}/auth/meta/start`} />
      ) : null}

      <SectionLabel>How you use IG Focus Hub</SectionLabel>
      {show("notifications") ? <ListRow icon={<BellRing size={22} strokeWidth={1.75} />} label="Notifications" value={push === "granted" ? "On" : push === "denied" ? "Blocked" : "Off"} onClick={() => setSheet("notifications")} /> : null}
      {show("quiet hours") ? <ListRow icon={<Moon size={22} strokeWidth={1.75} />} label="Quiet hours" value={notif.data?.quietHours.enabled ? `${notif.data.quietHours.start}–${notif.data.quietHours.end}` : "Off"} onClick={() => setSheet("quiet")} /> : null}
      {show("saved replies") ? <ListRow icon={<MessageSquareText size={22} strokeWidth={1.75} />} label="Saved replies" value={replies.data ? String(replies.data.replies.length) : undefined} onClick={() => setSheet("replies")} /> : null}
      {!installed && show("add to home screen") ? <ListRow icon={<Smartphone size={22} strokeWidth={1.75} />} label="Add to Home Screen" value="Not installed" onClick={() => setSheet("install")} /> : null}

      <SectionLabel>More info and support</SectionLabel>
      {show("what works") ? <ListRow icon={<ShieldCheck size={22} strokeWidth={1.75} />} label="What works, what depends on Meta" onClick={() => setSheet("matrix")} /> : null}
      {show("anti-doomscrolling") ? <ListRow icon={<CircleHelp size={22} strokeWidth={1.75} />} label="Anti-doomscrolling rules" onClick={() => setSheet("rules")} /> : null}
      {show("about") ? <ListRow icon={<Info size={22} strokeWidth={1.75} />} label="About" value={me.data?.mock ? "Demo mode" : me.data?.user?.email} onClick={() => setSheet("about")} /> : null}

      {/* ---- sheets ---- */}
      <Sheet open={sheet === "account" && !!editing} onClose={() => setSheet(null)} title="Account">
        {editing ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2">
              <Avatar name={editing.displayName} src={editing.avatarUrl} size={80} accent={editing.accent} />
              <p className="text-base font-semibold">{editing.username}</p>
              <p className="text-xs text-ig-text-secondary">Page {editing.pageId} · IG {editing.igUserId}</p>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Short label</span>
              <input defaultValue={editing.label} maxLength={24} onBlur={(e) => e.target.value && e.target.value !== editing.label && void saveAccount(editing.id, { label: e.target.value })} className="w-full rounded-ig bg-ig-bg-highlight px-3 py-2 text-sm outline-none" />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">Accent color</p>
              <div className="flex gap-3">
                {(Object.keys(ACCENT_CLASS) as AccountAccent[]).map((c) => (
                  <button key={c} type="button" aria-label={c} onClick={() => void saveAccount(editing.id, { accent: c })} className={`size-9 rounded-full ${ACCENT_CLASS[c]} ${editing.accent === c ? "ring-2 ring-ig-text ring-offset-2 ring-offset-ig-bg" : ""}`} />
                ))}
              </div>
            </div>
            <Button block variant="danger" onClick={() => void disconnect(editing.id)}>Remove account</Button>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={sheet === "notifications"} onClose={() => setSheet(null)} title="Notifications">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Push alerts on this device <span className="block text-xs text-ig-text-secondary">{push === "granted" ? "Enabled" : push === "denied" ? "Blocked in browser settings" : push === "unsupported" ? "Not supported in this browser" : "Off"}</span></span>
          {push !== "granted" && push !== "unsupported" ? <Button size="sm" onClick={() => void onEnablePush()}>Turn on</Button> : null}
        </div>
        {pushError ? <p className="text-xs text-ig-error">{pushError}</p> : null}
        {notif.data?.prefs.map((p) => {
          const acc = list.find((a) => a.id === p.accountId);
          if (!acc) return null;
          return (
            <div key={p.accountId} className="mt-4">
              <div className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2 text-sm font-semibold"><Avatar name={acc.displayName} src={acc.avatarUrl} size={24} accent={acc.accent} /> {acc.username}</span>
                <Toggle checked={p.enabled} onChange={(v) => void setPrefs({ ...p, enabled: v })} label={`Alerts for ${acc.username}`} />
              </div>
              {p.enabled ? (
                <div className="divide-y divide-ig-separator-elevated">
                  {(Object.keys(KIND_TEXT) as NotificationKind[]).map((k) => (
                    <label key={k} className="flex items-center justify-between py-2.5 text-sm">
                      {KIND_TEXT[k]}
                      <Toggle checked={p.kinds[k] !== false} onChange={(v) => void setPrefs({ ...p, kinds: { ...p.kinds, [k]: v } })} label={KIND_TEXT[k]} />
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </Sheet>

      <Sheet open={sheet === "quiet"} onClose={() => setSheet(null)} title="Quiet hours">
        {notif.data ? (
          <div className="divide-y divide-ig-separator-elevated">
            <label className="flex items-center justify-between py-3 text-sm">
              <span>Quiet hours <span className="block text-xs text-ig-text-secondary">Suppress normal alerts between these times</span></span>
              <Toggle checked={notif.data.quietHours.enabled} onChange={(v) => void setQuiet({ ...notif.data!.quietHours, enabled: v })} label="Quiet hours" />
            </label>
            <div className="flex items-center gap-3 py-3 text-sm">
              <input type="time" value={notif.data.quietHours.start} onChange={(e) => void setQuiet({ ...notif.data!.quietHours, start: e.target.value })} className="rounded-ig bg-ig-bg-highlight px-2 py-1" />
              <span className="text-ig-text-secondary">to</span>
              <input type="time" value={notif.data.quietHours.end} onChange={(e) => void setQuiet({ ...notif.data!.quietHours, end: e.target.value })} className="rounded-ig bg-ig-bg-highlight px-2 py-1" />
            </div>
            <label className="flex items-center justify-between py-3 text-sm">
              <span>Let priority contacts through</span>
              <Toggle checked={notif.data.quietHours.allowPriorityContacts} onChange={(v) => void setQuiet({ ...notif.data!.quietHours, allowPriorityContacts: v })} label="Priority contacts" />
            </label>
          </div>
        ) : null}
      </Sheet>

      <Sheet open={sheet === "replies"} onClose={() => setSheet(null)} title="Saved replies">
        <ul className="divide-y divide-ig-separator-elevated">
          {(replies.data?.replies ?? []).map((r) => (
            <li key={r.id} className="py-3">
              <p className="text-sm font-semibold">{r.title} {r.shortcut ? <span className="ml-1 rounded bg-ig-bg-highlight px-1.5 py-0.5 text-[10px] text-ig-text-secondary">{r.shortcut}</span> : null}</p>
              <p className="mt-0.5 text-sm text-ig-text-secondary">{r.body}</p>
            </li>
          ))}
        </ul>
        <p className="pt-3 text-xs text-ig-text-secondary">Tap a saved reply above the composer to insert it. Editing arrives in Phase 3.</p>
      </Sheet>

      <Sheet open={sheet === "install"} onClose={() => setSheet(null)} title="Add to Home Screen">
        <p className="text-sm">No App Store needed.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li><strong>iPhone:</strong> open this page in Safari → tap Share → <strong>Add to Home Screen</strong>.</li>
          <li><strong>Android:</strong> Chrome → menu → <strong>Install app</strong>.</li>
          <li>Open it from the Home Screen. Push alerts only work from the installed app.</li>
        </ol>
      </Sheet>

      <Sheet open={sheet === "matrix"} onClose={() => setSheet(null)} title="Feature availability">
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

      <Sheet open={sheet === "rules"} onClose={() => setSheet(null)} title="Anti-doomscrolling rules">
        <ul className="space-y-2 text-sm">
          {ANTI_SCROLL_RULES.map((r) => <li key={r}>• {r}</li>)}
        </ul>
      </Sheet>

      <Sheet open={sheet === "about"} onClose={() => setSheet(null)} title="About">
        <p className="text-sm font-semibold">IG Focus Hub</p>
        <p className="mt-1 text-sm text-ig-text-secondary">Instagram without the doomscrolling. {me.data?.mock ? "Running in demo mode with fixture data." : `Signed in as ${me.data?.user?.email ?? ""}.`}</p>
      </Sheet>
    </>
  );
}
