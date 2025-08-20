import { IUserRepo } from "../../domain/repositories/IUserRepo";
import bcrypt from "bcryptjs";

export class CreateUser {
  constructor(private users: IUserRepo) {}
  async exec({ email, password }: { email: string; password: string }) {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new Error("Email inválido");
    }
    if (!password || password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    const hash = await bcrypt.hash(password, 10);
    const created = await this.users.create({ email, passwordHash: hash });
    return { id: created.id, email: created.email };
  }
}
