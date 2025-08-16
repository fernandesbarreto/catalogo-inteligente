import { PrismaClient, Prisma } from "@prisma/client";
import {
  IPaintRepo,
  CreatePaintDTO,
  UpdatePaintDTO,
} from "../../../domain/repositories/IPaintRepo";

export class PaintRepoPrisma implements IPaintRepo {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreatePaintDTO) {
    const p = await this.prisma.paint.create({ data });
    return p;
  }

  async findById(id: string) {
    const p = await this.prisma.paint.findUnique({ where: { id } });
    return p ?? null;
  }

  async list(skip: number, take: number, q?: string) {
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { color: { contains: q, mode: Prisma.QueryMode.insensitive } },
            {
              surfaceType: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
            { roomType: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { finish: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { line: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};
    return this.prisma.paint.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdatePaintDTO) {
    const p = await this.prisma.paint.update({ where: { id }, data });
    return p;
  }

  async delete(id: string) {
    await this.prisma.paint.delete({ where: { id } });
  }
}
