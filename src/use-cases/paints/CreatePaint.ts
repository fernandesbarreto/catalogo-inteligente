import { IPaintRepo } from "../../domain/repositories/IPaintRepo";

export class CreatePaint {
  constructor(private paints: IPaintRepo) {}

  async exec(input: {
    name: string;
    color: string;
    surfaceType: string;
    roomType: string;
    finish: string;
    features?: string | null;
    line?: string | null;
  }) {
    if (!input.name?.trim()) throw new Error("name is required");
    if (!input.color?.trim()) throw new Error("color is required");
    if (!input.surfaceType?.trim()) throw new Error("surfaceType is required");
    if (!input.roomType?.trim()) throw new Error("roomType is required");
    if (!input.finish?.trim()) throw new Error("finish is required");
    return this.paints.create(input);
  }
}
