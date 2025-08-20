import { Request, Response } from "express";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const makeAuthController = (loginUC: any) => ({
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Authenticate user and get access token
   *     description: Login with email and password to receive a JWT access token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       400:
   *         description: Invalid request body
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  login: async (req: Request, res: Response) => {
    try {
      const body = loginSchema.parse(req.body);
      const out = await loginUC.exec(body);
      res.status(200).json(out);
    } catch (error: any) {
      if (error.status === 401) {
        return res.status(401).json({
          error: "invalid_credentials",
          message: "Email ou senha incorretos",
        });
      }
      if (error.status === 400) {
        return res.status(400).json({
          error: "invalid_request",
          message: "Dados de login inválidos",
        });
      }
      // Re-throw other errors to be handled by the global error handler
      throw error;
    }
  },
});
