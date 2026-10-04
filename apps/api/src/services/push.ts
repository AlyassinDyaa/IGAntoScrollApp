import webpush from "web-push";
import type { PushPayload, PushSubscriptionInput } from "@ig-focus-hub/shared";
import type { Env } from "../config.js";
import type { Store } from "../types.js";

/**
 * Web Push for the installed iPhone PWA. Honors quiet hours and per-account prefs.
 * Priority contacts can bypass quiet hours when the owner allows it.
 */
export class PushService {
  private readonly enabled: boolean;

  constructor(
    private readonly env: Env,
    private readonly store: Store,
  ) {
    this.enabled = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
    if (this.enabled) webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  }

  get publicKey(): string | null {
    return this.env.VAPID_PUBLIC_KEY ?? null;
  }

  async shouldDeliver(payload: PushPayload, opts: { priorityContact: boolean }): Promise<boolean> {
    const prefs = (await this.store.listNotificationPrefs()).find((p) => p.accountId === payload.accountId);
    if (prefs && (!prefs.enabled || prefs.kinds[payload.kind] === false)) return false;
    const quiet = await this.store.getQuietHours();
    if (quiet.enabled && isWithinQuietHours(quiet.start, quiet.end, new Date())) {
      return quiet.allowPriorityContacts && opts.priorityContact;
    }
    return true;
  }

  async send(payload: PushPayload): Promise<{ sent: number; removed: number }> {
    if (!this.enabled) return { sent: 0, removed: 0 };
    const subs = await this.store.listPushSubscriptions();
    let sent = 0;
    let removed = 0;
    await Promise.all(
      subs.map(async (sub: PushSubscriptionInput) => {
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 });
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.store.removePushSubscription(sub.endpoint);
            removed += 1;
          }
        }
      }),
    );
    return { sent, removed };
  }
}

export function isWithinQuietHours(start: string, end: string, now: Date): boolean {
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const s = toMin(start);
  const e = toMin(end);
  const n = now.getHours() * 60 + now.getMinutes();
  if (s === e) return false;
  return s < e ? n >= s && n < e : n >= s || n < e;
}
