export type GenInput = {
  sceneId: string; // e.g., "varanda/moderna-01"
  hex: string; // e.g., "#5FA3D1"
  finish?: "fosco" | "acetinado" | "semibrilho" | "brilhante";
  seed?: number;
  size?: "1024x1024" | "1024x768" | "768x1024";
};

export type GenOutput = {
  imageBase64: string;
  provider: "local" | "openai" | "stability";
  promptUsed: string;
  seed?: number;
  imageUrl?: string;
};

export type ListScenesInput = { roomType?: string };

export type ListScenesOutput = {
  scenes: {
    id: string;
    roomType: string;
    label: string;
    thumbBase64?: string;
  }[];
};
