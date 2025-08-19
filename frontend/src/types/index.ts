export interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  imageBase64?: string;
  imageProvider?: string;
}

export interface Paint {
  id: string;
  name: string;
  color: string;
  colorHex: string;
  surfaceType: string;
  roomType: string;
  finish: string;
  features?: string;
  line?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = "chat" | "paints";
