import { IPaintRepo } from "../../domain/repositories/IPaintRepo";

export class UpdatePaint {
  constructor(private paints: IPaintRepo) {}
  exec(
    id: string,
    data: {
      name?: string;
      color?: string;
      surfaceType?: string;
      roomType?: string;
      finish?: string;
      features?: string | null;
      line?: string | null;
    }
  ) {
    return this.paints.update(id, data);
  }
}
