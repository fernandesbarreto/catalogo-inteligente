import fs from "fs";
import path from "path";
import sharp from "sharp";
import { generatePaletteImageFast } from "./generate_palette_image_fast";
import { GenInput, GenOutput } from "../../../domain/images/types";

const getAssetsDir = () =>
  process.env.ASSETS_SCENES_DIR ||
  path.resolve(__dirname, "../../../assets/scenes");

function buildPrompt(hex: string, finish?: string) {
  const finishText = finish ? ` (${finish})` : "";
  return `Foto realista do mesmo ambiente; pintar APENAS a área mascarada (parede) com a cor ${hex}${finishText}; preservar móveis, textura e luz; sem textos/logos.`;
}

export async function generatePaletteImage(
  input: GenInput
): Promise<GenOutput> {
  const provider = (process.env.IMAGE_PROVIDER || "local").toLowerCase();

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(input);
    } catch (e) {
      // se quiser, reative fallback aqui:
      // console.error("[OpenAI fallback]", e);
      // return await generatePaletteImageFast(input);
      throw e;
    }
  }

  // Default fallback local (rápido)
  return generatePaletteImageFast(input);
}

/**
 * Normaliza a máscara para usar alpha:
 * - pixels ESCUROS (luminância < 128) => alpha 0 (EDITAR / pintar)
 * - pixels CLAROS (>=128)             => alpha 255 (PRESERVAR)
 * Se sua máscara estiver invertida, troque o ternário abaixo.
 */
async function normalizeMaskToAlpha(maskPath: string): Promise<Buffer> {
  // Carrega RGBA bruto
  const { data, info } = await sharp(maskPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }); // RGBA

  // Detecta se já existe alpha "útil" (pixels bem transparentes e bem opacos)
  let minA = 255,
    maxA = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }

  // Heurística: alpha já está presente e variado => só binariza e retorna
  if (minA <= 5 && maxA >= 250) {
    const out = Buffer.from(data);
    for (let i = 3; i < out.length; i += 4) {
      out[i] = out[i] <= 127 ? 0 : 255; // binariza o alpha existente
    }
    return sharp(out, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  // Caso não exista alpha útil, derive da luminância (opcionalmente invertível)
  const out = Buffer.from(data); // RGBA
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i],
      g = out[i + 1],
      b = out[i + 2];
    const lumin = (r + g + b) / 3;
    // ESCURO = parede => alpha 0 (editar) | CLARO = preservar => alpha 255
    out[i + 3] = lumin < 128 ? 0 : 255;
  }

  // Auto‑inversão se ficar "quase tudo" transparente (evita erro de lado)
  let trans = 0;
  for (let i = 3; i < out.length; i += 4) if (out[i] === 0) trans++;
  const pct = (trans / (info.width * info.height)) * 100;
  if (pct < 0.2 || pct > 99.8) {
    for (let i = 3; i < out.length; i += 4) out[i] = out[i] ? 0 : 255;
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
async function generateWithOpenAI(input: GenInput): Promise<GenOutput> {
  console.error("[generateWithOpenAI] input", JSON.stringify(input, null, 2));
  const { sceneId, hex, finish, size } = input;
  const [roomType, sceneName] = sceneId.split("/");
  const sceneDir = path.join(getAssetsDir(), roomType, sceneName);
  const basePath = path.join(sceneDir, "base.jpg");
  const maskPath = path.join(sceneDir, "mask.png");

  if (!fs.existsSync(basePath) || !fs.existsSync(maskPath)) {
    throw new Error(`Scene not found or missing assets for '${sceneId}'`);
  }

  const prompt = buildPrompt(hex, finish);
  const sizeStr = size || "1024x1024";

  // 1) Base com alpha garantido (RGBA)
  const baseImg = sharp(basePath).ensureAlpha();
  const basePng = await baseImg.png().toBuffer();

  // 2) Máscara normalizada (alpha 0 = editar; 255 = preservar)
  let maskBuf = await normalizeMaskToAlpha(maskPath);

  // 2b) Sanity de alpha: % de pixels transparentes vs opacos
  const { transparentPct, opaquePct } = await alphaStats(maskBuf);
  console.error(
    `[mask] alpha stats -> transparent=${transparentPct.toFixed(
      2
    )}% opaque=${opaquePct.toFixed(2)}%`
  );
  console.error(`mask path: ${maskPath}`);
  if (transparentPct < 0.2) {
    throw new Error(
      `mask_too_small: área transparente <0.2% (quase nada a editar)`
    );
  }
  if (transparentPct > 99.8) {
    throw new Error(
      `mask_all_transparent: área transparente >99.8% (quase tudo a editar)`
    );
  }

  // 3) Multipart com mimetype/filename explícitos
  const form = new FormData();
  form.append("model", "dall-e-2"); // explícito
  form.append("image", new Blob([basePng], { type: "image/png" }), "image.png");
  form.append("mask", new Blob([maskBuf], { type: "image/png" }), "mask.png");
  form.append("prompt", prompt);
  form.append("size", sizeStr);

  // 4) Chamada direta ao endpoint (sem console.log no Response!)
  const resp = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: form,
  });

  const raw = await resp.clone().text(); // dump seguro
  if (!resp.ok) {
    console.error("[openai raw error]", raw.slice(0, 2000));
    throw new Error(`openai_images_edits_error: ${resp.status} ${raw}`);
  }

  // Não faça console.log(resp) — quebra o protocolo MCP
  console.error("[openai status]", resp.status, resp.statusText);

  let json: { data?: { b64_json?: string }[] } = {};
  try {
    json = JSON.parse(raw);
  } catch {
    // Se vier algo estranho, loga e falha de forma clara
    throw new Error(`openai_non_json_response: ${raw.slice(0, 500)}`);
  }

  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    console.error("[openai empty data]", raw.slice(0, 2000));
    throw new Error("openai_empty_image");
  }

  return {
    imageBase64: `data:image/png;base64,${b64}`,
    provider: "openai",
    promptUsed: prompt,
    seed: input.seed,
  };
}

// Estatística simples do canal alpha (0–255)
async function alphaStats(pngWithAlpha: Buffer) {
  const { data, info } = await sharp(pngWithAlpha)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let trans = 0,
    opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a <= 5) trans++;
    else if (a >= 250) opaque++;
  }
  const total = info.width * info.height;
  return {
    transparentPct: (trans / total) * 100,
    opaquePct: (opaque / total) * 100,
  };
}
