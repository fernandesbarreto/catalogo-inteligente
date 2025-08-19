/* Session memory with TTL and LRU, with optional Redis backend. */
import type { Redis } from "ioredis";

export type SessionFilters = {
  surfaceType?: string;
  roomType?: string;
  finish?: string;
  line?: string;
};

export interface SessionSnapshot {
  filters?: SessionFilters;
  lastQuery?: string;
  lastPicks?: Array<{ id: string; reason: string }>;
  nextOffset?: number;
  seenIds?: string[];
  lastUpdatedAt: number;
}

export interface ISessionMemory {
  get(sessionId: string): Promise<SessionSnapshot | undefined>;
  set(sessionId: string, snapshot: SessionSnapshot): Promise<void>;
  reset(sessionId: string): Promise<void>;
}

/** In-memory implementation with TTL + simple LRU eviction. */
export class InMemorySessionMemory implements ISessionMemory {
  private store = new Map<string, SessionSnapshot & { expiresAt: number }>();
  private accessOrder: string[] = [];
  constructor(
    private readonly ttlSeconds: number = 3600,
    private readonly maxEntries: number = 10000
  ) {}

  private now(): number {
    return Date.now();
  }

  private touch(sessionId: string) {
    // Move to the end (most recently used)
    const idx = this.accessOrder.indexOf(sessionId);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(sessionId);
  }

  private evictIfNeeded() {
    while (this.accessOrder.length > this.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.store.delete(oldest);
    }
  }

  private removeIfExpired(sessionId: string) {
    const entry = this.store.get(sessionId);
    if (entry && entry.expiresAt <= this.now()) {
      this.store.delete(sessionId);
      const idx = this.accessOrder.indexOf(sessionId);
      if (idx >= 0) this.accessOrder.splice(idx, 1);
      return true;
    }
    return false;
  }

  async get(sessionId: string): Promise<SessionSnapshot | undefined> {
    if (!sessionId) return undefined;
    if (this.removeIfExpired(sessionId)) return undefined;
    const entry = this.store.get(sessionId);
    if (!entry) return undefined;
    this.touch(sessionId);
    return { filters: entry.filters, lastUpdatedAt: entry.lastUpdatedAt };
  }

  async set(sessionId: string, snapshot: SessionSnapshot): Promise<void> {
    if (!sessionId) return;
    const expiresAt = this.now() + this.ttlSeconds * 1000;
    this.store.set(sessionId, { ...snapshot, expiresAt });
    this.touch(sessionId);
    this.evictIfNeeded();
  }

  async reset(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
    const idx = this.accessOrder.indexOf(sessionId);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
  }
}

/** Redis implementation with TTL. Requires ioredis if REDIS_URL is provided. */
export class RedisSessionMemory implements ISessionMemory {
  constructor(private redis: Redis, private readonly ttlSeconds: number) {}

  private key(sessionId: string) {
    return `session:memory:${sessionId}`;
  }

  async get(sessionId: string): Promise<SessionSnapshot | undefined> {
    if (!sessionId) return undefined;
    const raw = await this.redis.get(this.key(sessionId));
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as SessionSnapshot;
      // touch TTL
      await this.redis.expire(this.key(sessionId), this.ttlSeconds);
      return parsed;
    } catch {
      return undefined;
    }
  }

  async set(sessionId: string, snapshot: SessionSnapshot): Promise<void> {
    if (!sessionId) return;
    await this.redis.setex(
      this.key(sessionId),
      this.ttlSeconds,
      JSON.stringify(snapshot)
    );
  }

  async reset(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }
}

export async function createSessionMemory(): Promise<ISessionMemory> {
  const ttl = parseInt(process.env.SESSION_TTL_SECONDS || "3600", 10);
  const maxEntries = parseInt(process.env.SESSION_MAX_ENTRIES || "10000", 10);
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const IORedis = require("ioredis");
      const client: Redis = new IORedis(redisUrl);
      // test connection quickly (non-blocking)
      client.on("error", () => {});
      return new RedisSessionMemory(client, ttl);
    } catch (e) {
      console.warn(
        "[SessionMemory] ioredis not available, falling back to in-memory",
        e
      );
    }
  }
  return new InMemorySessionMemory(ttl, maxEntries);
}
