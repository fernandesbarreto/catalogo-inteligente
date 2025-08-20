import { Request, Response } from "express";
import { createPaintSchema, updatePaintSchema } from "../dto/paint.dto";
import {
  PaintNotFoundError,
  PaintValidationError,
  EmbeddingGenerationError,
} from "../../../../domain/errors/PaintErrors";

export const makePaintsController = (uc: any) => ({
  /**
   * @swagger
   * /paints/public:
   *   get:
   *     summary: List all paints (Public)
   *     description: Get a paginated list of all paints with optional search (No authentication required)
   *     tags: [Paints]
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
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for paint name or color
   *       - in: query
   *         name: surfaceType
   *         schema:
   *           type: string
   *         description: Filter by surface type
   *       - in: query
   *         name: roomType
   *         schema:
   *           type: string
   *         description: Filter by room type
   *       - in: query
   *         name: finish
   *         schema:
   *           type: string
   *         description: Filter by finish type
   *       - in: query
   *         name: line
   *         schema:
   *           type: string
   *         description: Filter by paint line/brand
   *     responses:
   *       200:
   *         description: List of paints
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Paint'
   *                 pagination:
   *                   $ref: '#/components/schemas/Pagination'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  listPublic: async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const r = await uc.list.exec({ page, pageSize, q });
      res.json(r);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({
        error: "internal_error",
        message: errorMessage,
      });
    }
  },

  /**
   * @swagger
   * /paints/public/{id}:
   *   get:
   *     summary: Get a paint by ID (Public)
   *     description: Get a specific paint by its ID (No authentication required)
   *     tags: [Paints]
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
   *       404:
   *         description: Paint not found
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
  getPublic: async (req: Request, res: Response) => {
    try {
      const r = await uc.get.exec(req.params.id);
      res.json(r);
    } catch (error) {
      if (error instanceof PaintNotFoundError) {
        return res.status(404).json({
          error: "not_found",
          message: error.message,
        });
      }
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      res.status(500).json({
        error: "internal_error",
        message: errorMessage,
      });
    }
  },
});
