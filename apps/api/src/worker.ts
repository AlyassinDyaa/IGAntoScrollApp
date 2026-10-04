import { MetaClient } from "@ig-focus-hub/meta";
import { prisma } from "@ig-focus-hub/db";
import { loadEnv } from "./config.js";
import { GraphGateway } from "./services/graph-gateway.js";
import { createLocalMediaStorage } from "./services/media.js";
import { PrismaStore } from "./services/prisma-store.js";
import { createPublishWorker } from "./services/scheduler.js";

/**
 * Standalone publish worker (production). Runs scheduled posts from the Redis queue.
 * The single-owner model means one store per user; multi-user would resolve per job.
 */
const env = loadEnv();
if (env.MOCK_META) {
  console.log("Worker is not needed in mock mode (in-process timers are used).");
  process.exit(0);
}
const owner = await prisma.user.findFirst();
if (!owner) {
  console.error("No owner registered yet.");
  process.exit(1);
}
const store = new PrismaStore(owner.id);
const client = new MetaClient({ appId: env.META_APP_ID!, appSecret: env.META_APP_SECRET!, graphVersion: env.META_GRAPH_VERSION });
const gateway = new GraphGateway(client, store);
const media = createLocalMediaStorage(env);
const worker = createPublishWorker(env, {
  store,
  gateway,
  mediaUrls: async (draftId) => ((await store.getDraft(draftId))?.mediaAssetIds ?? []).map((k) => media.urlFor(k)),
});
worker.on("completed", (job) => console.log(`published ${job.data.scheduledPostId}`));
worker.on("failed", (job, err) => console.error(`failed ${job?.data.scheduledPostId}: ${err.message}`));
console.log("Publish worker started");
