import { IUserRepo } from "../../domain/repositories/IUserRepo";

export class GetUser {
  constructor(private users: IUserRepo) {}
  exec(id: string) {
    return this.users.findById(id);
  }
}
