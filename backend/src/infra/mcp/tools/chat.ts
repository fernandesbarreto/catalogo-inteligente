import { GenInput } from "../../../domain/images/types";
import { generatePaletteImage } from "./generate_palette_image";
import { makeChat } from "../../ai/llm/OpenAIChat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatToolInput {
  messages: ChatMessage[];
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
  return m ? `#${m[1]}` : null;
}

function simpleHeuristicIntent(message: string) {
  const q = message.toLowerCase();
  const wantsImage =
    /(gerar|mostrar|ver|prévia|preview).*\b(imagem|foto)\b/.test(q) ||
    /\b(quero|gostaria|desejo)\s+(ver|visualizar|mostrar).*\b(imagem|foto|prévia)\b/.test(
      q
    ) ||
    /\b(como|como ficaria|como se parece).*\b(imagem|foto|prévia)\b/.test(q);
  const hex = extractHex(message) || "#5FA3D1";
  const sceneId = "varanda/moderna-01";
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
    decision = {
      reply: h.wantsImage
        ? "Claro! Vou gerar uma prévia aplicada na parede."
        : "Certo! Posso sugerir tintas ou gerar uma prévia se desejar.",
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
