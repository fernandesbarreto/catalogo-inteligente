import { listScenesTool } from "./list_scenes";
import OpenAI from "openai";

type AllowedToolName =
  | "Procurar tinta no Prisma por filtro"
  | "Busca semântica de tinta nos embeddings"
  | "Geração de imagem";

export interface ToolRouterInput {
  userMessage: string;
  conversationSummary?: string; // mantido para compatibilidade
  keywords?: {
    environment?: string;
    color?: string;
    style?: string;
    mood?: string;
    keywords?: string[];
  };
  limit?: number;
  offset?: number;
}

export interface ToolRouterAction {
  tool: AllowedToolName;
  args: Record<string, any>;
  confidence: number; // 0..1
  rationale: string;
}

export interface ToolRouterOutput {
  actions: ToolRouterAction[];
  rationale?: string;
}

const IMAGE_SIZE_DEFAULT = "1024x1024" as const;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function intelligentToolRouter(
  input: ToolRouterInput
): Promise<ToolRouterOutput> {
  const user = sanitizeString(input.userMessage || "") || "";

  // Construir contexto das keywords se disponível
  let contextText = "";
  if (input.keywords) {
    const keywords = input.keywords;
    const keywordParts = [];

    if (keywords.environment)
      keywordParts.push(`ambiente: ${keywords.environment}`);
    if (keywords.color) keywordParts.push(`cor: ${keywords.color}`);
    if (keywords.style) keywordParts.push(`estilo: ${keywords.style}`);
    if (keywords.mood) keywordParts.push(`clima: ${keywords.mood}`);
    if (keywords.keywords && keywords.keywords.length > 0) {
      keywordParts.push(`palavras-chave: ${keywords.keywords.join(", ")}`);
    }

    contextText = keywordParts.join("; ");
  }

  const prompt = `
Você é um assistente que decide quais ferramentas usar baseado na mensagem do usuário.

Ferramentas disponíveis:
1. "Procurar tinta no Prisma por filtro" - Para buscar tintas específicas com filtros (cor, ambiente, acabamento, etc.)
2. "Busca semântica de tinta nos embeddings" - Para buscar tintas baseado em descrições vagas ou inspirações
3. "Geração de imagem" - Para gerar/mostrar imagens de como ficaria a cor aplicada

Contexto da conversa: ${contextText || "Nenhum contexto específico"}
Mensagem do usuário: "${user}"

Retorne APENAS um array JSON com as ferramentas que devem ser chamadas, em ordem de prioridade.
Cada item deve ter: {"tool": "nome_da_ferramenta", "confidence": 0.9, "rationale": "explicação"}

Exemplos:
- "Quero uma tinta azul para sala" → [{"tool": "Procurar tinta no Prisma por filtro", "confidence": 0.9, "rationale": "Busca específica por cor e ambiente"}]
- "Algo que combine com meu estilo moderno" → [{"tool": "Busca semântica de tinta nos embeddings", "confidence": 0.8, "rationale": "Busca baseada em estilo e inspiração"}]
- "Me mostre como ficaria azul" → [{"tool": "Geração de imagem", "confidence": 0.9, "rationale": "Usuário quer ver resultado visual"}]
- "Tintas azuis para sala e como ficaria" → [{"tool": "Procurar tinta no Prisma por filtro", "confidence": 0.8, "rationale": "Busca específica"}, {"tool": "Geração de imagem", "confidence": 0.9, "rationale": "Visualização solicitada"}]

Resposta (apenas JSON):`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const actions = JSON.parse(content);

    // Validar e processar as ações
    const validActions = actions
      .filter(
        (action: any) =>
          action.tool &&
          typeof action.confidence === "number" &&
          action.rationale
      )
      .slice(0, 2); // Máximo 2 ações

    // Adicionar argumentos baseados no tipo de tool e contexto
    const processedActions = validActions.map((action: any) => {
      const baseAction = {
        tool: action.tool as AllowedToolName,
        confidence: action.confidence,
        rationale: action.rationale,
        args: {} as Record<string, any>,
      };

      // Configurar argumentos baseado no tipo de tool
      if (action.tool === "Geração de imagem") {
        // Mapear cor das keywords para hex se disponível
        let hex: string | undefined;
        if (input.keywords?.color) {
          const colorToHexMap: Record<string, string> = {
            branco: "#FFFFFF",
            preto: "#000000",
            azul: "#1D39C9",
            vermelho: "#D14747",
            verde: "#61D161",
            amarelo: "#F4D125",
            rosa: "#CE7EA6",
            marrom: "#93591F",
            laranja: "#EC7F13",
            bege: "#E2CD9C",
            roxo: "#AF25F4",
            cinza: "#737373",
            turquesa: "#47D1AF",
            coral: "#DD673C",
            dourado: "#D1BE61",
            prateado: "#737373",
            vinho: "#C91D73",
            jade: "#1F9346",
            aqua: "#96E9E2",
            ciano: "#1F9393",
          };
          hex = colorToHexMap[input.keywords.color];
        }

        baseAction.args = {
          sceneId: "varanda/moderna-01", // padrão
          ...(hex ? { hex } : {}),
          size: IMAGE_SIZE_DEFAULT,
        };
      } else if (action.tool === "Procurar tinta no Prisma por filtro") {
        baseAction.args = {
          query: user,
          filters: {},
          ...(input.limit ? { limit: input.limit } : {}),
          ...(input.offset ? { offset: input.offset } : {}),
        };
      } else if (action.tool === "Busca semântica de tinta nos embeddings") {
        baseAction.args = {
          query: user,
          filters: {},
          top_k: Math.min(input.limit || 8, 20) || 8,
          ...(input.offset ? { offset: input.offset } : {}),
        };
      }

      return baseAction;
    });

    return {
      actions: processedActions,
      rationale:
        processedActions.length === 0
          ? "Nenhuma ferramenta relevante identificada"
          : undefined,
    };
  } catch (error) {
    console.error("[intelligentToolRouter] Error:", error);

    // Fallback para lógica antiga em caso de erro
    return toolRouterFallback(input);
  }
}

function sanitizeString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHexMaybe(input?: string): string | undefined {
  if (!input) return undefined;
  let h = input.trim().toLowerCase();
  const m = h.match(/^#?[0-9a-f]{3}$|^#?[0-9a-f]{6}$/i);
  if (!m) return undefined;
  h = h.replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${h.toUpperCase()}`;
}

function extractHex(text: string): string | undefined {
  const m = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  return normalizeHexMaybe(m ? `#${m[1]}` : undefined);
}

function parsePagination(text: string, limit?: number, offset?: number) {
  // Explicit limit/offset overrides inferred values
  const limMatch = text.match(/\b(?:limit|limite)\s*[:=]?\s*(\d{1,3})\b/i);
  const offMatch = text.match(
    /\b(?:offset|página\s*offset|pagin[aá]cao\s*offset)\s*[:=]?\s*(\d{1,5})\b/i
  );
  const topKMatch = text.match(/\b(?:top[_\s-]?k|topk)\s*[:=]?\s*(\d{1,3})\b/i);
  const firstNMatch = text.match(
    /\b(?:primeir[ao]s?|retornar|trazer)\s*(\d{1,2})\b/i
  );
  const l =
    limit ?? Number(limMatch?.[1] || topKMatch?.[1] || firstNMatch?.[1] || "0");
  const o = offset ?? Number(offMatch?.[1] || "0");
  return {
    limit: Number.isFinite(l) && l > 0 ? Math.min(l, 20) : undefined,
    offset: Number.isFinite(o) && o >= 0 ? o : undefined,
  };
}

function detectStructuredFilters(text: string) {
  const q = text.toLowerCase();
  const filters: Record<string, string> = {};

  // line
  const line = text.match(/\b(?:line|linha)\s*[:=]\s*([\w\-\s]+)/i)?.[1];
  if (line) filters.line = sanitizeString(line) as string;

  // finish
  const finishMatch = q.match(
    /\b(fosco|acetinado|semibrilho|semi-brilho|brilhante)\b/
  );
  if (finishMatch)
    filters.finish = finishMatch[1].replace("semi-brilho", "semibrilho");
  const finishKV = text.match(
    /\b(?:finish|acabamento)\s*[:=]\s*([\w\-\s]+)/i
  )?.[1];
  if (finishKV && !filters.finish)
    filters.finish = sanitizeString(finishKV) as string;

  // surfaceType
  const surfaceKV = text.match(
    /\b(?:surfaceType|superf[ií]cie|superficie)\s*[:=]\s*([\w\-\s]+)/i
  )?.[1];
  if (surfaceKV) filters.surfaceType = sanitizeString(surfaceKV) as string;
  if (!filters.surfaceType) {
    if (/(parede|wall)/i.test(text)) filters.surfaceType = "parede";
    else if (/(teto|ceiling)/i.test(text)) filters.surfaceType = "teto";
    else if (/(piso|floor)/i.test(text)) filters.surfaceType = "piso";
    else if (/(azulejo|cer[aá]mica|tile)/i.test(text))
      filters.surfaceType = "azulejo/cerâmica";
  }

  // roomType
  const roomKV = text.match(
    /\b(?:roomType|ambiente|c[oô]modo)\s*[:=]\s*([\w\-\s]+)/i
  )?.[1];
  if (roomKV) filters.roomType = sanitizeString(roomKV) as string;
  if (!filters.roomType) {
    if (/(quarto)/i.test(q)) {
      filters.roomType = /infantil|crian[cç]a|kids|beb[eê]/i.test(q)
        ? "quarto infantil"
        : "quarto";
    } else if (/(sala|living|estar)/i.test(q)) filters.roomType = "sala";
    else if (/(cozinha|kitchen)/i.test(q)) filters.roomType = "cozinha";
    else if (/(banheiro|wc|lavabo|bath)/i.test(q))
      filters.roomType = "banheiro";
    else if (/(escrit[óo]rio|home office)/i.test(q))
      filters.roomType = "escritório";
    else if (/(exterior|externa|fachada|área externa)/i.test(q))
      filters.roomType = "área externa";
  }

  // name (not supported downstream, used to build query only)
  const nameKV = text.match(/\b(?:name|nome)\s*[:=]\s*([\w\-\s]+)/i)?.[1];

  // features (not directly supported downstream)
  const featuresKV = text.match(
    /\b(?:features|caracter[íi]sticas)\s*[:=]\s*([\w\-,\s]+)/i
  )?.[1];

  // hex
  const hexDirect = text.match(/\b(?:hex|cor)\s*[:=]\s*(#[0-9a-fA-F]{3,6})\b/);
  const hex = normalizeHexMaybe(hexDirect?.[1]) || extractHex(text);
  const colorMap: Record<string, string> = {
    branco: "branco",
    branca: "branco",
    white: "branco",
    preto: "preto",
    preta: "preto",
    black: "preto",
    cinza: "cinza",
    gray: "cinza",
    grey: "cinza",
    azul: "azul",
    blue: "azul",
    vermelho: "vermelho",
    red: "vermelho",
    verde: "verde",
    green: "verde",
    amarelo: "amarelo",
    yellow: "amarelo",
    rosa: "rosa",
    pink: "rosa",
    marrom: "marrom",
    brown: "marrom",
    laranja: "laranja",
    orange: "laranja",
    bege: "bege",
    beige: "bege",
  };
  for (const [key, value] of Object.entries(colorMap)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text)) {
      (filters as any).color = value;
      break;
    }
  }

  // query builder
  const queryParts: string[] = [];
  if (nameKV) queryParts.push(sanitizeString(nameKV)!);
  if (featuresKV) queryParts.push(sanitizeString(featuresKV)!);
  if (hex) queryParts.push(hex);
  const query = sanitizeString(queryParts.join(" ")) || "";

  const hasExplicit =
    !!filters.line ||
    !!filters.finish ||
    !!filters.surfaceType ||
    !!filters.roomType ||
    !!(filters as any).color ||
    !!hex ||
    !!nameKV ||
    !!featuresKV;

  return { filters, hex, query, hasExplicit };
}

async function validateSceneIdMaybe(sceneId?: string) {
  const id = sanitizeString(sceneId || "");
  if (!id) return undefined;
  try {
    const scenes = await listScenesTool({});
    const ok = scenes.scenes.find((s) => s.id === id);
    return ok ? id : undefined;
  } catch {
    return undefined;
  }
}

function wantsImageGeneration(text: string): boolean {
  const q = text.toLowerCase();
  return (
    (/(gerar|gere|mostrar|mostre|ver|prévia|preview|visualizar|repaint|aplicar)\b/.test(
      q
    ) &&
      /(imagem|foto|cena|parede|wall)/.test(q)) ||
    /\bsceneid\b/i.test(text) ||
    /\bmask\b/i.test(text)
  );
}

async function toolRouterFallback(
  input: ToolRouterInput
): Promise<ToolRouterOutput> {
  const user = sanitizeString(input.userMessage || "") || "";

  // Usar palavras-chave se disponíveis, senão usar summary completo
  let contextText = "";
  if (input.keywords) {
    const keywords = input.keywords;
    const keywordParts = [];

    if (keywords.environment)
      keywordParts.push(`ambiente: ${keywords.environment}`);
    if (keywords.color) keywordParts.push(`cor: ${keywords.color}`);
    if (keywords.style) keywordParts.push(`estilo: ${keywords.style}`);
    if (keywords.mood) keywordParts.push(`clima: ${keywords.mood}`);
    if (keywords.keywords && keywords.keywords.length > 0) {
      keywordParts.push(`palavras-chave: ${keywords.keywords.join(", ")}`);
    }

    contextText = keywordParts.join("; ");
  } else {
    // Fallback para o summary completo (compatibilidade)
    const summary = sanitizeString(input.conversationSummary || "");
    contextText = summary || "";
  }

  const combined = `${contextText ? contextText + "\n" : ""}${user}`.slice(
    -4000
  );

  const { limit, offset } = parsePagination(
    combined,
    input.limit,
    input.offset
  );
  const {
    filters,
    hex,
    query: builtQuery,
    hasExplicit,
  } = detectStructuredFilters(combined);

  // Image-specific params
  const sceneIdKV = combined.match(/\bsceneId\s*[:=]\s*([\w\-/]+)\b/i)?.[1];
  const maybeSceneId = await validateSceneIdMaybe(sceneIdKV);

  // Mapear cor das keywords para hex se disponível
  let keywordHex: string | undefined;
  if (input.keywords?.color) {
    const colorToHexMap: Record<string, string> = {
      branco: "#FFFFFF",
      preto: "#000000",
      azul: "#1D39C9",
      vermelho: "#D14747",
      verde: "#61D161",
      amarelo: "#F4D125",
      rosa: "#CE7EA6",
      marrom: "#93591F",
      laranja: "#EC7F13",
      bege: "#E2CD9C",
      roxo: "#AF25F4",
      cinza: "#737373",
      turquesa: "#47D1AF",
      coral: "#DD673C",
      dourado: "#D1BE61",
      prateado: "#737373",
      vinho: "#C91D73",
      jade: "#1F9346",
      aqua: "#96E9E2",
      ciano: "#1F9393",
    };
    keywordHex = colorToHexMap[input.keywords.color];
  }

  const normalizedHex = normalizeHexMaybe(
    keywordHex || hex || extractHex(combined)
  );

  const actions: ToolRouterAction[] = [];

  // Route: Prisma filter search when explicit structured constraints and user wants products
  const wantsProducts =
    /\b(tintas?|produt[oa]s?|resultados?|listar|procurar|buscar|recomendar|sugerir|cat[aá]logo|op[cç][oõ]es?)\b/i.test(
      combined
    );

  // Only do filter search if user explicitly wants products
  if (hasExplicit && wantsProducts) {
    const args: Record<string, any> = {
      query: sanitizeString(builtQuery) || "",
      filters: {
        ...(filters.surfaceType ? { surfaceType: filters.surfaceType } : {}),
        ...(filters.roomType ? { roomType: filters.roomType } : {}),
        ...(filters.finish ? { finish: filters.finish } : {}),
        ...(filters.line ? { line: filters.line } : {}),
        ...((filters as any).color ? { color: (filters as any).color } : {}),
        ...(offset !== undefined ? { offset } : {}),
      },
    };
    if (limit !== undefined) args.limit = limit; // consumer can enforce pagination

    actions.push({
      tool: "Procurar tinta no Prisma por filtro",
      args,
      confidence: 0.9,
      rationale:
        "Pedido com filtros/atributos estruturados para retornar produtos do catálogo.",
    });
  }

  // Route: Image generation when preview/visualization requested or scene/hex provided
  if (wantsImageGeneration(combined) || normalizedHex || maybeSceneId) {
    const args: Record<string, any> = {
      sceneId: maybeSceneId || "varanda/moderna-01",
      ...(normalizedHex ? { hex: normalizedHex } : {}),
      size: IMAGE_SIZE_DEFAULT,
    };

    actions.push({
      tool: "Geração de imagem",
      args,
      confidence: wantsImageGeneration(combined) ? 0.9 : 0.6,
      rationale:
        "Usuário pediu para visualizar/aplicar cor em cena; parâmetros normalizados.",
    });
  }

  // Route: Semantic search for fuzzy exploratory intent
  const fuzzyIntent =
    /\b(inspira[cç][aã]o|ideias?|quero algo|combina com|estilo|vibe|parecido com|tom|clima|sens[aã]o|descritivo|fuzzy)\b/i.test(
      combined
    );

  if (actions.length === 0 && (fuzzyIntent || !hasExplicit || !wantsProducts)) {
    const args: Record<string, any> = {
      query: sanitizeString(user) || "",
      filters: {
        ...(filters.surfaceType ? { surfaceType: filters.surfaceType } : {}),
        ...(filters.roomType ? { roomType: filters.roomType } : {}),
        ...(filters.finish ? { finish: filters.finish } : {}),
        ...(filters.line ? { line: filters.line } : {}),
        ...(offset !== undefined ? { offset } : {}),
      },
      top_k: Math.min(limit || 8, 20) || 8,
    };

    actions.push({
      tool: "Busca semântica de tinta nos embeddings",
      args,
      confidence: hasExplicit ? 0.7 : 0.85,
      rationale:
        "Consulta vaga/descritiva traduzida em busca semântica com filtros opcionais.",
    });
  }

  // If user explicitly wants image generation, prioritize it over product search
  if (wantsImageGeneration(combined) && actions.length > 1) {
    // Keep only image generation if user explicitly asked for it
    const imageAction = actions.find((a) => a.tool === "Geração de imagem");
    if (imageAction) {
      actions.length = 0;
      actions.push(imageAction);
    }
  }

  // If both retrieval and visualization help, ensure retrieval comes first
  if (actions.length > 1) {
    actions.sort((a, b) => {
      const order = (t: AllowedToolName) =>
        t === "Procurar tinta no Prisma por filtro"
          ? 0
          : t === "Busca semântica de tinta nos embeddings"
          ? 1
          : 2; // image last
      return order(a.tool) - order(b.tool);
    });
  }

  // Enforce max 2 actions
  const trimmed = actions.slice(0, 2);

  if (trimmed.length === 0) {
    return {
      actions: [],
      rationale: "Nenhuma ação relevante para este pedido.",
    };
  }

  console.log(`MCP Router: "${input.userMessage}" → ${actions.length} actions`);
  actions.forEach((a, i) => {
    console.log(
      `  ${i + 1}. ${a.tool} (${Math.round(a.confidence * 100)}%) - ${
        a.rationale
      }`
    );
  });

  return {
    actions,
    rationale: actions.length === 0 ? "No relevant tools found" : undefined,
  };
}

// Export da nova função inteligente como padrão
export const toolRouter = intelligentToolRouter;
