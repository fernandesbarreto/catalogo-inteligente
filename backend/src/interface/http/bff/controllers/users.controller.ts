import { Request, Response } from "express";
import { createUserSchema, updateUserSchema } from "../dto/user.dto";

export const makeUsersController = (uc: any) => ({
  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Create a new user
   *     description: Create a new user with email and password (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateUserRequest'
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid request body
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  create: async (req: Request, res: Response) => {
    const body = createUserSchema.parse(req.body);
    const r = await uc.create.exec(body);
    res.status(201).json(r);
  },

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: List all users
   *     description: Get a paginated list of all users (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  list: async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const r = await uc.list.exec({ page, pageSize });
    res.json(r);
  },

  /**
   * @swagger
   * /users/{id}:
   *   get:
   *     summary: Get user by ID
   *     description: Get a specific user by their ID (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       200:
   *         description: User found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  get: async (req: Request, res: Response) => {
    const r = await uc.get.exec(req.params.id);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  },

  /**
   * @swagger
   * /users/{id}:
   *   put:
   *     summary: Update user
   *     description: Update a user's information (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUserRequest'
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Invalid request body
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  update: async (req: Request, res: Response) => {
    const body = updateUserSchema.parse(req.body);
    const r = await uc.update.exec(req.params.id, body);
    res.json(r);
  },

  /**
   * @swagger
   * /users/{id}:
   *   delete:
   *     summary: Delete user
   *     description: Delete a user by their ID (Admin only)
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *     responses:
   *       204:
   *         description: User deleted successfully
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Admin role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  remove: async (req: Request, res: Response) => {
    await uc.delete.exec(req.params.id);
    res.status(204).end();
  },
});
