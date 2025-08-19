import { IPaintRepo } from "../../domain/repositories/IPaintRepo";

export class ListPaints {
  constructor(private paints: IPaintRepo) {}
  async exec({
    page = 1,
    pageSize = 20,
    q,
  }: {
    page?: number;
    pageSize?: number;
    q?: string;
  }) {
    const skip = (page - 1) * pageSize;
    const result = await this.paints.list(skip, pageSize, q);
    return result;
  }
}
