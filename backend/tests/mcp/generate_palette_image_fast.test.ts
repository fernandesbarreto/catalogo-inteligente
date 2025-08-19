import fs from "fs";
import path from "path";
import sharp from "sharp";
import { generatePaletteImageFast } from "../../src/infra/mcp/tools/generate_palette_image_fast";

const TMP_DIR = path.resolve(__dirname, "../../tmp/test-scenes");

async function setupScenes() {
  const sceneDir = path.join(TMP_DIR, "sala", "clara-01");
  await fs.promises.mkdir(sceneDir, { recursive: true });
  const width = 128;
  const height = 128;
  const base = Buffer.alloc(width * height * 3, 200);
  const baseImg = await sharp(base, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer();
  await fs.promises.writeFile(path.join(sceneDir, "base.jpg"), baseImg);
  const mask = Buffer.alloc(width * height * 3, 0);
  for (let y = 16; y < 112; y++) {
    for (let x = 16; x < 112; x++) {
      const idx = (y * width + x) * 3;
      mask[idx] = 255;
      mask[idx + 1] = 255;
      mask[idx + 2] = 255;
    }
  }
  const maskImg = await sharp(mask, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  await fs.promises.writeFile(path.join(sceneDir, "mask.png"), maskImg);
}

describe("generate_palette_image_fast", () => {
  beforeAll(async () => {
    await setupScenes();
    process.env.ASSETS_SCENES_DIR = TMP_DIR;
  });

  it("returns non-empty base64 image", async () => {
    const out = await generatePaletteImageFast({
      sceneId: "sala/clara-01",
      hex: "#5FA3D1",
      size: "1024x1024",
    });
    expect(out.provider).toBe("local");
    expect(out.imageBase64).toMatch(/^data:image\/png;base64,/);
    expect(out.promptUsed).toContain("fast-recolor");
  });
});
