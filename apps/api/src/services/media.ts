import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Env } from "../config.js";

/**
 * Dev media storage: files land in apps/api/uploads and are served at /media/*.
 * Meta needs a public HTTPS URL, so production swaps this for object storage
 * (S3/R2) behind the same interface.
 */
export interface MediaStorage {
  save(buffer: Buffer, filename: string, mimeType: string): Promise<{ key: string; url: string }>;
  urlFor(key: string): string;
}

export function createLocalMediaStorage(env: Env): MediaStorage {
  const dir = join(process.cwd(), env.UPLOAD_DIR);
  return {
    async save(buffer, filename) {
      await mkdir(dir, { recursive: true });
      const key = `${randomUUID()}${extname(filename).toLowerCase()}`;
      await writeFile(join(dir, key), buffer);
      return { key, url: this.urlFor(key) };
    },
    urlFor(key) {
      return `${env.API_URL}/media/${key}`;
    },
  };
}

export const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);
export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;
