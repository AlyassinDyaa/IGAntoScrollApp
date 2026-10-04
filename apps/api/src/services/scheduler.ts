import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import type { Env } from "../config.js";
import type { MetaGateway, Store } from "../types.js";

export const PUBLISH_QUEUE = "publish";

export interface PublishJobData {
  scheduledPostId: string;
}

/**
 * Durable scheduled publishing. In mock mode we run an in-process timer instead of
 * Redis so `pnpm dev` works with zero services.
 */
export interface Scheduler {
  enqueue(scheduledPostId: string, publishAt: Date): Promise<void>;
  cancel(scheduledPostId: string): Promise<void>;
  close(): Promise<void>;
}

export function createScheduler(env: Env, deps: { store: Store; gateway: MetaGateway; mediaUrls: (draftId: string) => Promise<string[]> }): Scheduler {
  const run = async (scheduledPostId: string) => runPublishJob(scheduledPostId, deps);

  if (env.MOCK_META || !env.REDIS_URL) {
    const timers = new Map<string, NodeJS.Timeout>();
    return {
      async enqueue(id, publishAt) {
        const delay = Math.max(0, publishAt.getTime() - Date.now());
        clearTimeout(timers.get(id));
        timers.set(id, setTimeout(() => void run(id), delay));
      },
      async cancel(id) {
        clearTimeout(timers.get(id));
        timers.delete(id);
      },
      async close() {
        for (const t of timers.values()) clearTimeout(t);
      },
    };
  }

  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue<PublishJobData>(PUBLISH_QUEUE, { connection });
  return {
    async enqueue(id, publishAt) {
      await queue.add(
        "publish",
        { scheduledPostId: id },
        { jobId: id, delay: Math.max(0, publishAt.getTime() - Date.now()), attempts: 3, backoff: { type: "exponential", delay: 60_000 }, removeOnComplete: true },
      );
    },
    async cancel(id) {
      const job = await queue.getJob(id);
      await job?.remove();
    },
    async close() {
      await queue.close();
      connection.disconnect();
    },
  };
}

export function createPublishWorker(env: Env, deps: { store: Store; gateway: MetaGateway; mediaUrls: (draftId: string) => Promise<string[]> }): Worker<PublishJobData> {
  if (!env.REDIS_URL) throw new Error("REDIS_URL is required for the publish worker");
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return new Worker<PublishJobData>(
    PUBLISH_QUEUE,
    async (job: Job<PublishJobData>) => runPublishJob(job.data.scheduledPostId, deps),
    { connection, concurrency: 2 },
  );
}

export async function runPublishJob(
  scheduledPostId: string,
  deps: { store: Store; gateway: MetaGateway; mediaUrls: (draftId: string) => Promise<string[]> },
): Promise<void> {
  const { store, gateway } = deps;
  const all = await store.listScheduled();
  const post = all.find((p) => p.id === scheduledPostId);
  if (!post || post.status === "cancelled" || post.status === "published") return;

  const [draft, account] = await Promise.all([store.getDraft(post.draftId), store.getAccount(post.accountId)]);
  if (!draft || !account) {
    await store.updateScheduled(post.id, { status: "failed", lastError: "Draft or account no longer exists" });
    return;
  }
  await store.updateScheduled(post.id, { status: "uploading", lastError: null });
  try {
    const urls = await deps.mediaUrls(draft.id);
    await store.updateScheduled(post.id, { status: "processing" });
    const result = await gateway.publish(account, draft, urls);
    await store.updateScheduled(post.id, { status: "published", igMediaId: result.igMediaId, permalink: result.permalink });
  } catch (err) {
    await store.updateScheduled(post.id, { status: "failed", lastError: (err as Error).message });
    throw err;
  }
}
