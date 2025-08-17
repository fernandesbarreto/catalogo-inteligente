import { IPaintRepo } from "../../domain/repositories/IPaintRepo";

export class GetPaint {
  constructor(private paints: IPaintRepo) {}
  exec(id: string) {
    return this.paints.findById(id);
  }
}
