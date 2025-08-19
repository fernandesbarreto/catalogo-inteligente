import fs from "fs";
import path from "path";
import sharp from "sharp";
import { listScenesTool } from "../../src/infra/mcp/tools/list_scenes";

const TMP_DIR = path.resolve(__dirname, "../../tmp/test-scenes");

async function setupScenes() {
  const sceneDir = path.join(TMP_DIR, "quarto", "moderno-01");
  await fs.promises.mkdir(sceneDir, { recursive: true });
  // base.jpg: simple gradient
  const width = 128;
  const height = 128;
  const base = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      base[idx] = 180; // r
      base[idx + 1] = 180; // g
      base[idx + 2] = 180; // b
    }
  }
  const baseImg = await sharp(base, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer();
  await fs.promises.writeFile(path.join(sceneDir, "base.jpg"), baseImg);
  // mask.png: white rectangle area
  const mask = Buffer.alloc(width * height * 3, 0);
  for (let y = 32; y < 96; y++) {
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

describe("list_scenes tool", () => {
  beforeAll(async () => {
    await setupScenes();
    process.env.ASSETS_SCENES_DIR = TMP_DIR;
  });

  it("should list scenes from directory", async () => {
    const result = await listScenesTool({});
    expect(Array.isArray(result.scenes)).toBe(true);
    const found = result.scenes.find((s) => s.id === "quarto/moderno-01");
    expect(found).toBeTruthy();
    expect(found?.roomType).toBe("quarto");
    expect(found?.label).toMatch(/quarto moderno 01/);
    expect(found?.thumbBase64).toMatch(/^data:image\//);
  });
});
