import { PrismaClient, Prisma } from "@prisma/client";
import {
  IPaintRepo,
  CreatePaintDTO,
  UpdatePaintDTO,
  PaginatedResult,
} from "../../../domain/repositories/IPaintRepo";

export class PaintRepoPrisma implements IPaintRepo {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreatePaintDTO) {
    const p = await this.prisma.paint.create({ data });
    return p as { id: string } & CreatePaintDTO;
  }

  async createWithEmbedding(data: CreatePaintDTO, embedding: number[]) {
    // Use raw SQL to handle the vector type
    const result = await this.prisma.$queryRaw<
      Array<{ id: string } & CreatePaintDTO>
    >`
      INSERT INTO paints (id, name, color, color_hex, surface_type, room_type, finish, features, line, embedding, created_at, updated_at)
      VALUES (gen_random_uuid()::text, ${data.name}, ${data.color}, ${data.colorHex}, ${data.surfaceType}, ${data.roomType}, ${data.finish}, ${data.features}, ${data.line}, ${embedding}::vector, NOW(), NOW())
      RETURNING id, name, color, color_hex, surface_type, room_type, finish, features, line, embedding::text as embedding, created_at, updated_at
    `;

    return result[0];
  }

  async findById(id: string) {
    const p = await this.prisma.paint.findUnique({ where: { id } });
    return p ?? null;
  }

  async list(skip: number, take: number, q?: string): Promise<PaginatedResult<{ id: string } & CreatePaintDTO>> {
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

    const [data, total] = await Promise.all([
      this.prisma.paint.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.paint.count({ where }),
    ]);

    const page = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(total / take);

    return {
      data,
      total,
      page,
      pageSize: take,
      totalPages,
    };
  }

  async update(id: string, data: UpdatePaintDTO) {
    const p = await this.prisma.paint.update({ where: { id }, data });
    return p;
  }

  async delete(id: string) {
    await this.prisma.paint.delete({ where: { id } });
  }
}
