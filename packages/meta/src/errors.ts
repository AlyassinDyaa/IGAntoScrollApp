export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number | null,
    public readonly subcode: number | null,
    public readonly fbtraceId: string | null,
  ) {
    super(message);
    this.name = "MetaApiError";
  }

  /** Token expired / revoked -> account should be flagged needs_reauth. */
  get isAuthError(): boolean {
    return this.code === 190 || this.status === 401;
  }

  /** Rate limited -> back off and retry later. */
  get isRateLimited(): boolean {
    return this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613;
  }
}
