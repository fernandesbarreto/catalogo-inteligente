import { IPaintRepo } from "../../domain/repositories/IPaintRepo";

export class DeletePaint {
  constructor(private paints: IPaintRepo) {}
  exec(id: string) {
    return this.paints.delete(id);
  }
}
