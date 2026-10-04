"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: init.body instanceof FormData ? init.headers : { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = typeof json?.error === "string" ? json.error : Array.isArray(json?.error) ? json.error.map((i: { message: string }) => i.message).join(", ") : res.statusText;
    throw new ApiError(msg, res.status);
  }
  return json as T;
}

export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const put = <T,>(path: string, body: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const patch = <T,>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T,>(path: string) => api<T>(path, { method: "DELETE" });

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  mutate: (updater: (prev: T | null) => T | null) => void;
}

/** Minimal data hook: fetch on mount and whenever the path changes. */
export function useApi<T>(path: string | null): UseApiState<T> {
  const [tick, setTick] = useState(0);
  const key = path ? `${path}|${tick}` : null;
  const [resolved, setResolved] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null });
  const latest = useRef<string | null>(null);

  useEffect(() => {
    if (!key || !path) return;
    latest.current = key;
    api<T>(path)
      .then((data) => {
        if (latest.current === key) setResolved({ key, data, error: null });
      })
      .catch((e: Error) => {
        if (latest.current === key) setResolved((prev) => ({ key, data: prev.data, error: e.message }));
      });
  }, [key, path]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const mutate = useCallback((updater: (prev: T | null) => T | null) => setResolved((prev) => ({ ...prev, data: updater(prev.data) })), []);
  return { data: resolved.data, error: resolved.key === key ? resolved.error : null, loading: !!key && resolved.key !== key, reload, mutate };
}
