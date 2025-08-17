import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET!;
const expiresIn = process.env.JWT_EXPIRES_IN || "1h";

export type JwtPayload = { sub: string; email: string };

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(
    payload,
    secret as jwt.Secret,
    {
      expiresIn,
    } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
