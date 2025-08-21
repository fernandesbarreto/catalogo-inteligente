import fs from "fs";
import path from "path";
import sharp from "sharp";
import tinycolor from "tinycolor2";
import { GenInput, GenOutput } from "../../../domain/images/types";

const getAssetsDir = () =>
  process.env.ASSETS_SCENES_DIR ||
  path.resolve(__dirname, "../../../assets/scenes");

// Blend a solid color over base using mask as alpha
export async function generatePaletteImageFast(
  input: GenInput
): Promise<GenOutput> {
  const start = Date.now();
  const { sceneId, hex, size } = input;

  const [roomType, sceneName] = sceneId.split("/");
  const sceneDir = path.join(getAssetsDir(), roomType, sceneName);
  const basePath = path.join(sceneDir, "base.jpg");
  const maskPath = path.join(sceneDir, "mask.png");

  if (!fs.existsSync(basePath) || !fs.existsSync(maskPath)) {
    throw new Error(`Cena não encontrada ou assets ausentes para '${sceneId}'`);
  }

  // Load images
  const baseImage = sharp(basePath);
  const maskImage = sharp(maskPath).ensureAlpha();

  // Optional resize
  let width: number | undefined;
  let height: number | undefined;
  if (size) {
    const [w, h] = size.split("x").map((n) => parseInt(n, 10));
    if (Number.isFinite(w) && Number.isFinite(h)) {
      width = w;
      height = h;
    }
  }

  const baseResized =
    width && height ? baseImage.resize(width, height) : baseImage;
  const maskResized =
    width && height ? maskImage.resize(width, height) : maskImage;

  // Create solid color image
  const color = tinycolor(hex).toRgb();
  const overlay = sharp({
    create: {
      width: width || (await baseImage.metadata()).width || 1024,
      height: height || (await baseImage.metadata()).height || 1024,
      channels: 4,
      background: { r: color.r, g: color.g, b: color.b, alpha: 1 },
    },
  });

  // Use mask alpha to composite only on wall
  const maskBuffer = await maskResized
    .raw()
    .toBuffer({ resolveWithObject: true });
  const maskMeta = maskBuffer.info;
  const maskRaw = maskBuffer.data;

  // Convert mask grayscale to alpha channel
  // Expect mask.png with white (255) for paint area, black (0) elsewhere
  const alpha = Buffer.alloc(maskRaw.length / maskMeta.channels);
  for (let i = 0, j = 0; i < maskRaw.length; i += maskMeta.channels, j++) {
    // Take first channel as luminance proxy
    alpha[j] = maskRaw[i];
  }

  // Create overlay with alpha from mask
  const coloredWithMask = await overlay
    .removeAlpha() // ensure only RGB before adding alpha
    .joinChannel(alpha, {
      raw: { width: maskMeta.width, height: maskMeta.height, channels: 1 },
    })
    .png()
    .toBuffer();

  // Blend mode: overlay soft look by reducing opacity a bit
  // Use overlay blending, adjust intensity by pre-mixing with semi-transparent white via linear lightness
  const blended = await baseResized
    .composite([
      {
        input: coloredWithMask,
        blend: "overlay",
      },
    ])
    .png()
    .toBuffer();

  const imageBase64 = blended.toString("base64");
  const latency = Date.now() - start;
  console.error(
    `[generatePaletteImageFast] sceneId=${sceneId} hex=${hex} provider=local ms=${latency}`
  );
  return {
    imageBase64: `data:image/png;base64,${imageBase64}`,
    provider: "local",
    promptUsed: `fast-recolor ${hex}`,
    seed: input.seed,
  };
}
