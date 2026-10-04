"use client";

import { post } from "./api";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushStatus = "unsupported" | "denied" | "prompt" | "granted";

export function pushStatus(): PushStatus {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  return Notification.permission === "default" ? "prompt" : (Notification.permission as PushStatus);
}

/** On iOS the PWA must be installed to the Home Screen before Web Push is allowed. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export async function enablePush(vapidPublicKey: string): Promise<PushStatus> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission as PushStatus;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
  await post("/push/subscribe", sub.toJSON());
  return "granted";
}
