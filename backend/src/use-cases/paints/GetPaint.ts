import { IPaintRepo } from "../../domain/repositories/IPaintRepo";
import { PaintNotFoundError } from "../../domain/errors/PaintErrors";

export class GetPaint {
  constructor(private paints: IPaintRepo) {}

  async exec(id: string) {
    const paint = await this.paints.findById(id);
    if (!paint) {
      throw new PaintNotFoundError(id);
    }
    return paint;
  }
}
