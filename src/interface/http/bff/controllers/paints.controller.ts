import { Request, Response } from "express";
import { createPaintSchema, updatePaintSchema } from "../dto/paint.dto";

export const makePaintsController = (uc: any) => ({
  /**
   * @swagger
   * /paints:
   *   post:
   *     summary: Create a new paint
   *     description: Create a new paint entry (Admin and Editor only)
   *     tags: [Paints]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreatePaintRequest'
   *     responses:
   *       201:
   *         description: Paint created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Paint'
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
   *         description: Forbidden - Admin or Editor role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  create: async (req: Request, res: Response) => {
    const body = createPaintSchema.parse(req.body);
    const r = await uc.create.exec(body);
    res.status(201).json(r);
  },

  /**
   * @swagger
   * /paints:
   *   get:
   *     summary: List all paints
   *     description: Get a paginated list of all paints with optional search (All authenticated users)
   *     tags: [Paints]
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
   *       - in: query
   *         name: q
   *         schema:
   *           type: string
   *         description: Search query for paint name, color, surface type, room type, finish, or line
   *     responses:
   *       200:
   *         description: List of paints
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Paint'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  list: async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const r = await uc.list.exec({ page, pageSize, q });
    res.json(r);
  },

  /**
   * @swagger
   * /paints/{id}:
   *   get:
   *     summary: Get paint by ID
   *     description: Get a specific paint by its ID (All authenticated users)
   *     tags: [Paints]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Paint ID
   *     responses:
   *       200:
   *         description: Paint found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Paint'
   *       401:
   *         description: Unauthorized
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       403:
   *         description: Forbidden - Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Paint not found
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
   * /paints/{id}:
   *   put:
   *     summary: Update paint
   *     description: Update a paint's information (Admin and Editor only)
   *     tags: [Paints]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Paint ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdatePaintRequest'
   *     responses:
   *       200:
   *         description: Paint updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Paint'
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
   *         description: Forbidden - Admin or Editor role required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Paint not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  update: async (req: Request, res: Response) => {
    const body = updatePaintSchema.parse(req.body);
    const r = await uc.update.exec(req.params.id, body);
    res.json(r);
  },

  /**
   * @swagger
   * /paints/{id}:
   *   delete:
   *     summary: Delete paint
   *     description: Delete a paint by its ID (Admin only)
   *     tags: [Paints]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Paint ID
   *     responses:
   *       204:
   *         description: Paint deleted successfully
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
   *         description: Paint not found
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
