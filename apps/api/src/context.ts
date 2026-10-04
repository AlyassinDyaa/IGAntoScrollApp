import { MetaClient } from "@ig-focus-hub/meta";
import type { Env } from "./config.js";
import { MemoryStore } from "./mock/memory-store.js";
import { MockGateway } from "./mock/mock-gateway.js";
import { GraphGateway } from "./services/graph-gateway.js";
import { createLocalMediaStorage, type MediaStorage } from "./services/media.js";
import { PrismaStore } from "./services/prisma-store.js";
import { PushService } from "./services/push.js";
import { createScheduler, type Scheduler } from "./services/scheduler.js";
import type { MetaGateway, Store } from "./types.js";

export const MOCK_USER_ID = "owner_demo";

export interface AppContext {
  env: Env;
  media: MediaStorage;
  metaClient: MetaClient | null;
  /** Resolve the owner-scoped store + gateway for a request. */
  forUser(userId: string): { store: Store; gateway: MetaGateway; push: PushService; scheduler: Scheduler };
  close(): Promise<void>;
}

export function createContext(env: Env): AppContext {
  const media = createLocalMediaStorage(env);
  const metaClient = env.MOCK_META
    ? null
    : new MetaClient({ appId: env.META_APP_ID!, appSecret: env.META_APP_SECRET!, graphVersion: env.META_GRAPH_VERSION });

  const cache = new Map<string, ReturnType<AppContext["forUser"]>>();
  const mediaUrlsFor = (store: Store) => async (draftId: string) => {
    const draft = await store.getDraft(draftId);
    return (draft?.mediaAssetIds ?? []).map((key) => media.urlFor(key));
  };

  return {
    env,
    media,
    metaClient,
    forUser(userId) {
      const hit = cache.get(userId);
      if (hit) return hit;
      let store: Store;
      let gateway: MetaGateway;
      if (env.MOCK_META) {
        store = new MemoryStore();
        gateway = new MockGateway();
      } else {
        const ps = new PrismaStore(userId);
        store = ps;
        gateway = new GraphGateway(metaClient!, ps);
      }
      const push = new PushService(env, store);
      const scheduler = createScheduler(env, { store, gateway, mediaUrls: mediaUrlsFor(store) });
      const bundle = { store, gateway, push, scheduler };
      cache.set(userId, bundle);
      return bundle;
    },
    async close() {
      await Promise.all([...cache.values()].map((b) => b.scheduler.close()));
    },
  };
}
