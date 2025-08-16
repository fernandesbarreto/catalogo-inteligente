import { IUserRepo } from "../../domain/repositories/IUserRepo";
import bcrypt from "bcryptjs";

export class CreateUser {
  constructor(private users: IUserRepo) {}
  async exec({ email, password }: { email: string; password: string }) {
    const hash = await bcrypt.hash(password, 10);
    return this.users.create({ email, passwordHash: hash });
  }
}
