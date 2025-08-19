import { IUserRepo } from "../../domain/repositories/IUserRepo";

export class DeleteUser {
  constructor(private users: IUserRepo) {}
  exec(id: string) {
    return this.users.delete(id);
  }
}
