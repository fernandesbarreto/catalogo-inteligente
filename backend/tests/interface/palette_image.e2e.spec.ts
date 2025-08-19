import request from "supertest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { makeApp } from "../../src/app";

const TMP_DIR = path.resolve(__dirname, "../../tmp/test-scenes");

async function setupScenes() {
  const sceneDir = path.join(TMP_DIR, "varanda", "moderna-01");
  await fs.promises.mkdir(sceneDir, { recursive: true });
  const width = 128;
  const height = 128;
  const base = Buffer.alloc(width * height * 3, 180);
  const baseImg = await sharp(base, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer();
  await fs.promises.writeFile(path.join(sceneDir, "base.jpg"), baseImg);
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

describe("POST /bff/ai/palette-image (local)", () => {
  beforeAll(async () => {
    await setupScenes();
    process.env.ASSETS_SCENES_DIR = TMP_DIR;
    process.env.IMAGE_PROVIDER = "local";
  });

  it("returns 200 and base64 image", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/bff/ai/palette-image")
      .send({
        sceneId: "varanda/moderna-01",
        hex: "#3366FF",
        size: "1024x1024",
      });
    expect(res.status).toBe(200);
    expect(res.body.imageBase64).toMatch(/^data:image\/png;base64,/);
  }, 15000);
});
