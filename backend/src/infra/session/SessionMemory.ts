/* Session memory with TTL and LRU, with optional Redis backend. */
import type { Redis } from "ioredis";

export type SessionFilters = {
  surfaceType?: string;
  roomType?: string;
  finish?: string;
  line?: string;
};

export type ConversationKeywords = {
  environment?: string; // tipo de ambiente (sala, quarto, cozinha, etc.)
  color?: string; // cor principal mencionada
  style?: string; // estilo mencionado (moderno, clássico, etc.)
  mood?: string; // clima/atmosfera (tranquilo, energético, etc.)
  keywords?: string[]; // array de palavras-chave adicionais
};

export interface SessionSnapshot {
  filters?: SessionFilters;
  keywords?: ConversationKeywords;
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

/**
 * Extrai palavras-chave da conversa em vez de salvar toda a conversa
 */
export function extractKeywordsFromConversation(
  history: Array<{ role: "user" | "assistant"; content: string }>
): ConversationKeywords {
  const combinedText = history
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  const keywords: ConversationKeywords = {};

  // Extrair tipo de ambiente
  const environmentPatterns = {
    sala: /\b(sala|living|estar)\b/,
    quarto: /\b(quarto|bedroom|dormitório)\b/,
    cozinha: /\b(cozinha|kitchen)\b/,
    banheiro: /\b(banheiro|bathroom|wc)\b/,
    varanda: /\b(varanda|balcony|sacada)\b/,
    escritorio: /\b(escritório|office|estudo)\b/,
    corredor: /\b(corredor|hall|passagem)\b/,
  };

  for (const [env, pattern] of Object.entries(environmentPatterns)) {
    if (pattern.test(combinedText)) {
      keywords.environment = env;
      break;
    }
  }

  // Extrair cor principal
  const colorPatterns = {
    branco: /\b(branco|branca|white)\b/,
    preto: /\b(preto|preta|black)\b/,
    azul: /\b(azul|blue)\b/,
    vermelho: /\b(vermelho|vermelha|red)\b/,
    verde: /\b(verde|green)\b/,
    amarelo: /\b(amarelo|amarela|yellow)\b/,
    rosa: /\b(rosa|pink)\b/,
    marrom: /\b(marrom|brown)\b/,
    laranja: /\b(laranja|orange)\b/,
    bege: /\b(bege|beige)\b/,
    roxo: /\b(roxo|purple|violeta|violet)\b/,
    cinza: /\b(cinza|gray|grey)\b/,
    turquesa: /\b(turquesa|turquoise)\b/,
    coral: /\b(coral|salmão|salmon)\b/,
    dourado: /\b(dourado|gold)\b/,
    prateado: /\b(prateado|silver)\b/,
    vinho: /\b(vinho|wine|burgundy)\b/,
    jade: /\b(jade)\b/,
    aqua: /\b(aqua)\b/,
    ciano: /\b(ciano|teal)\b/,
  };

  for (const [color, pattern] of Object.entries(colorPatterns)) {
    if (pattern.test(combinedText)) {
      keywords.color = color;
      break;
    }
  }

  // Extrair estilo
  const stylePatterns = {
    moderno: /\b(moderno|moderna|contemporâneo|contemporânea)\b/,
    classico: /\b(clássico|clássica|tradicional)\b/,
    minimalista: /\b(minimalista|minimalismo)\b/,
    rustico: /\b(rústico|rústica|country)\b/,
    industrial: /\b(industrial|industrializado)\b/,
    escandinavo: /\b(escandinavo|escandinava|nórdico|nórdica)\b/,
    bohemio: /\b(boêmio|boêmia|bohemian)\b/,
    vintage: /\b(vintage|retrô|retro)\b/,
    luxuoso: /\b(luxuoso|luxuosa|luxury)\b/,
    clean: /\b(clean|limpo|limpa)\b/,
  };

  for (const [style, pattern] of Object.entries(stylePatterns)) {
    if (pattern.test(combinedText)) {
      keywords.style = style;
      break;
    }
  }

  // Extrair clima/atmosfera
  const moodPatterns = {
    tranquilo: /\b(tranquilo|tranquila|calmo|calma|sereno|serena)\b/,
    energetico: /\b(energético|energética|vibrante|dinâmico|dinâmica)\b/,
    acolhedor: /\b(acolhedor|acolhedora|aconchegante|warm)\b/,
    elegante: /\b(elegante|sofisticado|sofisticada)\b/,
    romantico: /\b(romântico|romântica|romance)\b/,
    profissional: /\b(profissional|corporativo|corporativa)\b/,
    divertido: /\b(divertido|divertida|alegre|colorido|colorida)\b/,
    neutro: /\b(neutro|neutra|neutro)\b/,
  };

  for (const [mood, pattern] of Object.entries(moodPatterns)) {
    if (pattern.test(combinedText)) {
      keywords.mood = mood;
      break;
    }
  }

  // Extrair palavras-chave adicionais
  const additionalKeywords = [];
  const keywordPatterns = [
    /\b(iluminação|luz|clara|escura)\b/,
    /\b(textura|texturizado|liso|rugoso)\b/,
    /\b(acabamento|fosco|acetinado|brilhante|semibrilho)\b/,
    /\b(linha|premium|standard|econômica)\b/,
    /\b(durabilidade|resistente|lavável|lavavel)\b/,
    /\b(eco|sustentável|natural)\b/,
    /\b(antialérgico|antibacteriano)\b/,
    /\b(clean|limpo|limpa)\b/,
  ];

  for (const pattern of keywordPatterns) {
    const match = combinedText.match(pattern);
    if (match) {
      additionalKeywords.push(match[0]);
    }
  }

  if (additionalKeywords.length > 0) {
    keywords.keywords = [...new Set(additionalKeywords)]; // Remove duplicatas
  }

  return keywords;
}
