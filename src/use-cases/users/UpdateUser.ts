import { IUserRepo } from "../../domain/repositories/IUserRepo";
import bcrypt from "bcryptjs";

export class UpdateUser {
  constructor(private users: IUserRepo) {}
  async exec(
    id: string,
    { email, password }: { email?: string; password?: string }
  ) {
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
    return this.users.update(id, { email, passwordHash });
  }
}
