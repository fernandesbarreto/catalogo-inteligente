import fs from "fs";
import path from "path";
import sharp from "sharp";
import { generatePaletteImageFast } from "./generate_palette_image_fast";
import { GenInput, GenOutput } from "../../../domain/images/types";
import { hexToColorName } from "./hexToColor";

const getAssetsDir = () =>
  process.env.ASSETS_SCENES_DIR ||
  path.resolve(__dirname, "../../../assets/scenes");

function buildPrompt(hex: string, finish?: string) {
  return `Smooth and uniform paint, matte paint, solid color "${hexToColorName(
    hex
  )}", no stains, no additional texture, no additional elements.`;
}

export async function generatePaletteImage(
  input: GenInput
): Promise<GenOutput> {
  console.error(
    `[generatePaletteImage] 🚀 INICIANDO - Input:`,
    JSON.stringify(input, null, 2)
  );
  const provider = (process.env.IMAGE_PROVIDER || "local").toLowerCase();
  console.error(`[generatePaletteImage] 🔧 Provider configurado: ${provider}`);

  if (provider === "stability" && process.env.STABILITY_API_KEY) {
    console.error(`[generatePaletteImage] 🎨 Usando Stability AI`);
    try {
      return await generateWithStability(input);
    } catch (e) {
      // fallback local se Stability falhar
      console.error(
        "[generatePaletteImage] ❌ Stability falhou, usando fallback local:",
        e
      );
      return generatePaletteImageFast(input);
    }
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      return await generateWithOpenAI(input);
    } catch (e) {
      console.error("[OpenAI fallback to local]", e);
      return generatePaletteImageFast(input);
    }
  }

  // Default fallback local (rápido)
  return generatePaletteImageFast(input);
}

/** ------------------ UTILs de máscara/tamanho ------------------ **/

// Mantém alpha existente se já for útil; senão deriva por luminância.
// Regra final: alpha 0 = EDITAR (parede), alpha 255 = PRESERVAR.
async function normalizeMaskToAlpha(maskPath: string): Promise<Buffer> {
  const { data, info } = await sharp(maskPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }); // RGBA

  let minA = 255,
    maxA = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }

  // Se já tem alpha útil, só binariza (0/255) e retorna
  if (minA <= 5 && maxA >= 250) {
    const out = Buffer.from(data);
    for (let i = 3; i < out.length; i += 4) {
      out[i] = out[i] <= 127 ? 0 : 255;
    }
    return sharp(out, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  // Caso contrário, deriva da luminância
  const out = Buffer.from(data); // RGBA
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i],
      g = out[i + 1],
      b = out[i + 2];
    const lumin = (r + g + b) / 3;
    out[i + 3] = lumin < 128 ? 0 : 255; // escuro = parede = editar
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

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

// ---------- Utils ----------
async function buildStabilityMask(
  maskPath: string,
  invert = false
): Promise<Buffer> {
  // Se existir alpha “útil”, use-o para gerar PB: alpha 0 => branco (editar), alpha 255 => preto (preservar)
  const { data, info } = await sharp(maskPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }); // RGBA
  let minA = 255,
    maxA = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a < minA) minA = a;
    if (a > maxA) maxA = a;
  }
  const outL = Buffer.alloc(info.width * info.height); // 1 canal (L)

  if (minA <= 5 && maxA >= 250) {
    // Usa alpha existente
    for (let i = 0, j = 0; j < outL.length; i += 4, j++) {
      const a = data[i + 3];
      const white = a <= 5 ? 255 : 0; // transparente => branco (editar)
      outL[j] = invert ? 255 - white : white;
    }
  } else {
    // Sem alpha útil → threshold pela luminância: escuro = parede
    for (let i = 0, j = 0; j < outL.length; i += 4, j++) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const lumin = (r + g + b) / 3;
      const white = lumin < 128 ? 255 : 0;
      outL[j] = invert ? 255 - white : white;
    }
  }

  return sharp(outL, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .png()
    .toBuffer();
}

async function ensureSameSize(buf: Buffer, w: number, h: number) {
  const meta = await sharp(buf).metadata();
  if (meta.width === w && meta.height === h) return buf;
  return sharp(buf).resize(w, h, { kernel: "nearest" }).png().toBuffer();
}

// ---------- Stability ----------
async function generateWithStability(input: GenInput): Promise<GenOutput> {
  console.error(
    "[generateWithStability] input",
    JSON.stringify(input, null, 2)
  );
  const { sceneId, hex, finish, size } = input;
  const [roomType, sceneName] = sceneId.split("/");
  const sceneDir = path.join(getAssetsDir(), roomType, sceneName);
  const basePath = path.join(sceneDir, "base.jpg");
  const maskPath = path.join(sceneDir, "mask.png");

  if (!fs.existsSync(basePath) || !fs.existsSync(maskPath)) {
    throw new Error(`Scene not found or missing assets for '${sceneId}'`);
  }

  const prompt =
    `Paint only the wall in ${hexToColorName(hex)}${
      finish ? ` (${finish})` : ""
    }. ` +
    `Wall with smooth and uniform paint; preserve furniture, floor and lighting; no text/logos.`;
  console.error(`[generateWithStability] 🎨 PROMPT: ${prompt}`);
  const sizeStr = size || "1024x1024";

  // Base RGBA
  const baseSharp = sharp(basePath).ensureAlpha();
  const baseMeta = await baseSharp.metadata();
  const basePng = await baseSharp.png().toBuffer();

  // Máscara PB (parede=BRANCO)
  let maskGray = await buildStabilityMask(maskPath);
  maskGray = await ensureSameSize(maskGray, baseMeta.width!, baseMeta.height!);

  // Multipart (Node 18+: fetch/Blob/FormData nativos)
  const form = new FormData();
  form.append("image", new Blob([basePng], { type: "image/png" }), "image.png");
  form.append("mask", new Blob([maskGray], { type: "image/png" }), "mask.png");
  form.append("prompt", prompt);
  form.append("output_format", "png");
  form.append("size", sizeStr);

  // —— parâmetros que aumentam a obediência ao prompt ——
  // Ajuste conforme seu gosto/ambiente:
  form.append("cfg_scale", process.env.STABILITY_CFG_SCALE ?? "10"); // 8–12 = bom
  // form.append("steps",     process.env.STABILITY_STEPS     ?? "35");
  // form.append("seed",      (input.seed ?? "").toString());
  form.append("negative_prompt", "text, watermark, logo, pattern, graffiti");

  // **fundamental**: diga de onde vem a máscara
  form.append("mask_source", "MASK_IMAGE_WHITE"); // BRANCO = editar (inpaint)

  const resp = await fetch(
    "https://api.stability.ai/v2beta/stable-image/edit/inpaint",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY!}`,
        Accept: "image/*", // como no exemplo oficial
      },
      body: form,
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`stability_error: ${resp.status} ${text}`);
  }

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = await resp.json();
    throw new Error(`stability_json_error: ${JSON.stringify(j)}`);
  }

  const arr = new Uint8Array(await resp.arrayBuffer());
  const b64 = Buffer.from(arr).toString("base64");

  return {
    imageBase64: `data:image/png;base64,${b64}`,
    provider: "stability",
    promptUsed: prompt,
    seed: input.seed,
  };
}

/** ------------------ OPENAI (mantido se quiser comparar) ------------------ **/

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

  const baseSharp = sharp(basePath).ensureAlpha();
  const baseMeta = await baseSharp.metadata();
  const basePng = await baseSharp.png().toBuffer();

  let maskBuf = await normalizeMaskToAlpha(maskPath);
  maskBuf = await ensureSameSize(maskBuf, baseMeta.width!, baseMeta.height!);

  const { transparentPct, opaquePct } = await alphaStats(maskBuf);
  console.error(
    `[openai mask] transparent=${transparentPct.toFixed(
      2
    )}% opaque=${opaquePct.toFixed(2)}%`
  );

  const form = new FormData();
  form.append("model", "dall-e-2");
  form.append("image", new Blob([basePng], { type: "image/png" }), "image.png");
  form.append("mask", new Blob([maskBuf], { type: "image/png" }), "mask.png");
  form.append("prompt", prompt);
  form.append("size", sizeStr);

  const resp = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: form,
  });

  const raw = await resp.clone().text();
  if (!resp.ok) {
    console.error("[openai raw error]", raw.slice(0, 2000));
    throw new Error(`openai_images_edits_error: ${resp.status} ${raw}`);
  }

  let json: { data?: Array<{ b64_json?: string; url?: string }> } = {};
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`openai_non_json_response: ${raw.slice(0, 500)}`);
  }

  const item = json.data?.[0];
  const b64 = item?.b64_json;
  const url = item?.url;

  const imageBase64 = b64
    ? `data:image/png;base64,${b64}`
    : url
    ? await (async () => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`openai_download_failed: ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        return `data:image/png;base64,${buf.toString("base64")}`;
      })()
    : undefined;

  if (!imageBase64) {
    console.error("[openai empty data]", raw.slice(0, 2000));
    throw new Error("openai_empty_image");
  }

  return {
    imageBase64,
    provider: "openai",
    promptUsed: prompt,
    seed: input.seed,
  };
}
