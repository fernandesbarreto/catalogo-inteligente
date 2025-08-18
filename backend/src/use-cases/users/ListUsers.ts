import { IUserRepo } from "../../domain/repositories/IUserRepo";

export class ListUsers {
  constructor(private users: IUserRepo) {}
  async exec({
    page = 1,
    pageSize = 20,
  }: {
    page?: number;
    pageSize?: number;
  }) {
    const skip = (page - 1) * pageSize;
    return this.users.list(skip, pageSize);
  }
}
