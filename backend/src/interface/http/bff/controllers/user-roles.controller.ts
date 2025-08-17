import { Request, Response } from "express";
import { z } from "zod";

export const makeUserRolesController = (repo: any) => ({
  /**
   * @swagger
   * /users/{id}/roles:
   *   get:
   *     summary: Get user roles
   *     description: Get all roles assigned to a specific user (Admin only)
   *     tags: [User Roles]
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
   *         description: User roles retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserRoles'
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
  list: async (req: Request, res: Response) => {
    const roles = await repo.findRoles(req.params.id);
    res.json({ userId: req.params.id, roles });
  },

  /**
   * @swagger
   * /users/{id}/roles:
   *   post:
   *     summary: Add role to user
   *     description: Assign a role to a specific user (Admin only)
   *     tags: [User Roles]
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
   *             $ref: '#/components/schemas/AddRoleRequest'
   *     responses:
   *       204:
   *         description: Role added successfully
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
   *         description: User or role not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  add: async (req: Request, res: Response) => {
    const body = z
      .object({ role: z.enum(["ADMIN", "EDITOR", "VIEWER"]) })
      .parse(req.body);
    await repo.addRole(req.params.id, body.role);
    res.status(204).end();
  },

  /**
   * @swagger
   * /users/{id}/roles/{role}:
   *   delete:
   *     summary: Remove role from user
   *     description: Remove a specific role from a user (Admin only)
   *     tags: [User Roles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
   *       - in: path
   *         name: role
   *         required: true
   *         schema:
   *           type: string
   *           enum: [ADMIN, EDITOR, VIEWER]
   *         description: Role to remove
   *     responses:
   *       204:
   *         description: Role removed successfully
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
   *         description: User or role not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  remove: async (req: Request, res: Response) => {
    const role = req.params.role;
    await repo.removeRole(req.params.id, role);
    res.status(204).end();
  },
});
