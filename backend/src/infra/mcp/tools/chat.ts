import { GenInput } from "../../../domain/images/types";
import { generatePaletteImage } from "./generate_palette_image";
import { makeChat } from "../../ai/llm/OpenAIChat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatToolInput {
  messages: ChatMessage[];
  picks?: Array<{
    id: string;
    reason: string;
  }>;
}

export interface ChatToolOutput {
  reply: string;
  image?: {
    imageBase64: string;
    provider: string;
    sceneId: string;
    hex: string;
    finish?: "fosco" | "acetinado" | "semibrilho" | "brilhante";
    size?: "1024x1024" | "1024x768" | "768x1024";
  };
}

function extractHex(text: string): string | null {
  const m = text.match(/#([0-9a-fA-F]{6})\b/);
  if (m) return `#${m[1]}`;

  // Mapeamento de cores comuns para hex
  const colorMap: Record<string, string> = {
    vermelho: "#FF0000",
    red: "#FF0000",
    azul: "#0000FF",
    blue: "#0000FF",
    verde: "#00FF00",
    green: "#00FF00",
    amarelo: "#FFFF00",
    yellow: "#FFFF00",
    branco: "#FFFFFF",
    white: "#FFFFFF",
    preto: "#000000",
    black: "#000000",
    cinza: "#808080",
    gray: "#808080",
    rosa: "#FFC0CB",
    pink: "#FFC0CB",
  };

  const q = text.toLowerCase();
  for (const [color, hex] of Object.entries(colorMap)) {
    if (q.includes(color)) {
      return hex;
    }
  }

  return null;
}

function simpleHeuristicIntent(message: string) {
  const q = message.toLowerCase();
  const wantsImage =
    /(gerar|gere|mostrar|ver|prévia|preview).*\b(imagem|foto)\b/.test(q) ||
    /\b(quero|gostaria|desejo)\s+(ver|visualizar|mostrar).*\b(imagem|foto|prévia)\b/.test(
      q
    ) ||
    /\b(como|como ficaria|como se parece).*\b(imagem|foto|prévia)\b/.test(q);
  const hex = extractHex(message) || "#5FA3D1";

  // Extrair ambiente da mensagem
  const environmentPatterns = {
    sala: /\b(sala|living|estar)\b/,
    quarto: /\b(quarto|bedroom|dormitório)\b/,
    cozinha: /\b(cozinha|kitchen)\b/,
    banheiro: /\b(banheiro|bathroom|wc)\b/,
    varanda: /\b(varanda|balcony|sacada)\b/,
    escritorio: /\b(escritório|office|estudo)\b/,
    corredor: /\b(corredor|hall|passagem)\b/,
  };

  let environment = "sala"; // default
  for (const [env, pattern] of Object.entries(environmentPatterns)) {
    if (pattern.test(q)) {
      environment = env;
      break;
    }
  }

  const sceneId = `${environment}/01`;
  const finishMatch = q.match(
    /\b(fosco|acetinado|semibrilho|semi-brilho|brilhante)\b/
  );
  const finish = (finishMatch?.[1] || undefined) as
    | "fosco"
    | "acetinado"
    | "semibrilho"
    | "brilhante"
    | undefined;
  const size: "1024x1024" | "1024x768" | "768x1024" | undefined = "1024x1024";
  return { wantsImage, sceneId, hex, finish, size };
}

export async function chatTool(input: ChatToolInput): Promise<ChatToolOutput> {
  const messages = input.messages || [];
  const picks = input.picks || [];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUser?.content || "";

  let decision: {
    reply: string;
    generateImage: boolean;
    sceneId?: string;
    hex?: string;
    finish?: "fosco" | "acetinado" | "semibrilho" | "brilhante";
    size?: "1024x1024" | "1024x768" | "768x1024";
  } | null = null;

  try {
    const system =
      "Você é um orquestrador de ferramentas MCP. Decida se o usuário quer ver uma imagem de uma parede pintada. IMPORTANTE: Só gere imagem se o usuário EXPLICITAMENTE pedir para ver uma imagem, prévia, ou visualização. Para pedidos simples de busca de tintas, NÃO ofereça imagens. Retorne APENAS JSON válido com este shape: {\n" +
      '  "reply": string,\n' +
      '  "generateImage": boolean,\n' +
      '  "sceneId"?: string,\n' +
      '  "hex"?: string,\n' +
      '  "finish"?: "fosco"|"acetinado"|"semibrilho"|"brilhante",\n' +
      '  "size"?: "1024x1024"|"1024x768"|"768x1024"\n' +
      "}. Use defaults sensatos se faltarem dados (sceneId=varanda/moderna-01, size=1024x1024).";
    const user =
      "Conversa até agora (formato role: content) e a última mensagem do usuário no fim:\n" +
      messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n")
        .slice(-4000);
    const chat = makeChat();
    const resp = (await chat.invoke([
      { role: "system", content: system } as any,
      { role: "user", content: user } as any,
    ] as any)) as any;
    const text = resp?.content?.[0]?.text ?? resp?.content ?? "";
    try {
      decision = JSON.parse(
        typeof text === "string" ? text : JSON.stringify(text)
      );
    } catch {
      // fallback para heurística
      decision = null;
    }
  } catch {
    decision = null;
  }

  if (!decision) {
    const h = simpleHeuristicIntent(userText);

    // Se há tintas encontradas e não é intenção de imagem, usar LLM para resposta natural
    let reply = "";
    if (picks.length > 0 && !h.wantsImage) {
      try {
        const system = `Você é um assistente especializado em tintas e acabamentos. Responda de forma natural, sucinta e prestativa.
        
Regras:
- Seja breve e direto ao ponto
- Use tom prestativo e amigável
- Mencione 1-2 tintas principais encontradas
- Inclua informações relevantes como acabamento, cor, linha
- Pergunte se o usuário quer ver mais opções ou gerar uma prévia
- Não seja muito formal ou técnico`;

        const user = `Pedido do usuário: "${userText}"

Tintas encontradas:
${picks
  .slice(0, 3)
  .map((p, i) => `${i + 1}. ${p.reason}`)
  .join("\n")}

Responda de forma natural e sucinta, mencionando as tintas encontradas.`;

        const chat = makeChat();
        const resp = await chat.invoke([
          { role: "system", content: system } as any,
          { role: "user", content: user } as any,
        ] as any);
        const content = resp?.content;
        reply = (
          typeof content === "string"
            ? content
            : Array.isArray(content) &&
              content[0] &&
              typeof content[0] === "object" &&
              "text" in content[0]
            ? content[0].text
            : ""
        ).trim();
      } catch (error) {
        console.error("[chatTool] Erro ao gerar resposta com LLM:", error);
        reply = `Encontrei ${
          picks.length
        } tinta(s) adequadas para sua necessidade. ${picks
          .slice(0, 2)
          .map((p) => p.reason.split(" - ")[0])
          .join(", ")} são boas opções.`;
      }
    } else {
      reply = h.wantsImage
        ? "Claro! Vou gerar uma prévia aplicada na parede."
        : "Certo! Posso sugerir tintas ou gerar uma prévia se desejar.";
    }

    decision = {
      reply,
      generateImage: h.wantsImage,
      sceneId: h.sceneId,
      hex: h.hex,
      finish: h.finish,
      size: h.size,
    };
  }

  // Safety: only allow image generation if user explicitly asked in the last message
  const explicit = simpleHeuristicIntent(userText).wantsImage;
  if (decision.generateImage && !explicit) {
    decision.generateImage = false;
    // If the reply implies image, soften it
    decision.reply =
      decision.reply ||
      "Certo! Posso listar opções de tintas ou gerar uma prévia se você pedir explicitamente.";
  }

  if (!decision.generateImage) {
    return { reply: decision.reply };
  }

  // Garantir parâmetros mínimos
  const sceneId = decision.sceneId || "varanda/moderna-01";
  const hex = decision.hex || extractHex(userText) || "#5FA3D1";
  const finish = decision.finish;
  const size = decision.size || "1024x1024";

  const genInput: GenInput = { sceneId, hex, finish, size };
  const out = await generatePaletteImage(genInput);

  return {
    reply:
      decision.reply ||
      "Aqui está uma prévia de como a cor ficaria na parede da cena escolhida.",
    image: {
      imageBase64: out.imageBase64,
      provider: out.provider,
      sceneId,
      hex,
      finish,
      size,
    },
  };
}
