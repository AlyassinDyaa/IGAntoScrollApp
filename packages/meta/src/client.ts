import { MetaApiError } from "./errors";

export interface MetaClientOptions {
  appId: string;
  appSecret: string;
  /** e.g. "v24.0" */
  graphVersion: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

type Query = Record<string, string | number | boolean | undefined | null>;

/**
 * Thin Graph API transport. Every feature module (messaging, publishing, audio...)
 * is a set of functions that take this client plus a page/user access token.
 */
export class MetaClient {
  readonly appId: string;
  readonly appSecret: string;
  readonly graphVersion: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(opts: MetaClientOptions) {
    this.appId = opts.appId;
    this.appSecret = opts.appSecret;
    this.graphVersion = opts.graphVersion;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.baseUrl = opts.baseUrl ?? "https://graph.facebook.com";
  }

  url(path: string, query: Query = {}): string {
    const u = new URL(`${this.baseUrl}/${this.graphVersion}/${path.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  async get<T>(path: string, query: Query, accessToken: string): Promise<T> {
    const res = await this.fetchImpl(this.url(path, { ...query, access_token: accessToken }));
    return this.parse<T>(res);
  }

  async post<T>(path: string, body: Query, accessToken: string): Promise<T> {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...body, access_token: accessToken })) {
      if (v !== undefined && v !== null) form.set(k, String(v));
    }
    const res = await this.fetchImpl(this.url(path), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    });
    return this.parse<T>(res);
  }

  async delete<T>(path: string, query: Query, accessToken: string): Promise<T> {
    const res = await this.fetchImpl(this.url(path, { ...query, access_token: accessToken }), {
      method: "DELETE",
    });
    return this.parse<T>(res);
  }

  private async parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok || (json && typeof json === "object" && "error" in json)) {
      const err = (json as { error?: Record<string, unknown> } | null)?.error ?? {};
      throw new MetaApiError(
        String(err.message ?? `Meta API request failed (${res.status})`),
        res.status,
        typeof err.code === "number" ? err.code : null,
        typeof err.error_subcode === "number" ? err.error_subcode : null,
        typeof err.fbtrace_id === "string" ? err.fbtrace_id : null,
      );
    }
    return json as T;
  }
}

/** Paged Graph responses. */
export interface Paged<T> {
  data: T[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string; previous?: string };
}
