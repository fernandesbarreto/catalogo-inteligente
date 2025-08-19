import fs from "fs";
import path from "path";
import {
  ListScenesInput,
  ListScenesOutput,
} from "../../../domain/images/types";

const getAssetsDir = () =>
  process.env.ASSETS_SCENES_DIR ||
  path.resolve(__dirname, "../../../assets/scenes");

function toLabelFromId(id: string): string {
  // id: "varanda/moderna-01" -> "varanda moderna 01"
  const pretty = id
    .replace(/\//g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return pretty;
}

export async function listScenesTool(
  input: ListScenesInput = {}
): Promise<ListScenesOutput> {
  const root = getAssetsDir();
  const scenes: ListScenesOutput["scenes"] = [];

  if (!fs.existsSync(root)) {
    return { scenes: [] };
  }

  const roomTypes = input.roomType
    ? [input.roomType]
    : fs.readdirSync(root).filter((d) => {
        try {
          return fs.statSync(path.join(root, d)).isDirectory();
        } catch {
          return false;
        }
      });

  for (const roomType of roomTypes) {
    const roomDir = path.join(root, roomType);
    if (!fs.existsSync(roomDir)) continue;
    const entries = fs.readdirSync(roomDir).filter((d) => {
      try {
        return fs.statSync(path.join(roomDir, d)).isDirectory();
      } catch {
        return false;
      }
    });
    for (const sceneFolder of entries) {
      const id = `${roomType}/${sceneFolder}`;
      const basePath = path.join(roomDir, sceneFolder, "base.jpg");
      const maskPath = path.join(roomDir, sceneFolder, "mask.png");
      if (!fs.existsSync(basePath) || !fs.existsSync(maskPath)) continue;

      let thumbBase64: string | undefined;
      try {
        const base = fs.readFileSync(basePath);
        // Return small inline preview; avoid heavy deps: just base64 of original for now
        thumbBase64 = `data:image/jpeg;base64,${base.toString("base64")}`;
      } catch {
        // ignore
      }

      scenes.push({
        id,
        roomType,
        label: toLabelFromId(id),
        thumbBase64,
      });
    }
  }

  return { scenes };
}
