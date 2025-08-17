import { IUserRepo } from "../../domain/repositories/IUserRepo";
import { signAccessToken } from "../../infra/auth/jwt";
import bcrypt from "bcryptjs";

export class Login {
  constructor(private users: IUserRepo) {}

  async exec({ email, password }: { email: string; password: string }) {
    if (!email || !password)
      throw Object.assign(new Error("Invalid credentials"), { status: 400 });

    const user = await this.users.findByEmail(email);
    if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw Object.assign(new Error("Unauthorized"), { status: 401 });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: { id: user.id, email: user.email },
    };
  }
}
