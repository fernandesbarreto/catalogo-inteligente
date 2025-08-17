import { PrismaClient } from "@prisma/client";
import {
  ISearchTool,
  SearchFilters,
} from "../../domain/repositories/ISearchTool";
import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";

export class FilterSearchTool implements ISearchTool {
  name = "filterSearch";

  constructor(private prisma: PrismaClient) {}

  async execute(
    query: string,
    filters?: SearchFilters
  ): Promise<RecommendationPick[]> {
    console.log(`[FilterSearchTool] Executando busca com query: "${query}"`, {
      filters,
    });

    const where: any = {};

    if (filters?.surfaceType) {
      where.surfaceType = {
        contains: filters.surfaceType,
        mode: "insensitive",
      };
    }
    if (filters?.roomType) {
      where.roomType = { contains: filters.roomType, mode: "insensitive" };
    }
    if (filters?.finish) {
      where.finish = { contains: filters.finish, mode: "insensitive" };
    }
    if (filters?.line) {
      where.line = { contains: filters.line, mode: "insensitive" };
    }

    // Busca por texto nos campos relevantes
    if (query.trim()) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { color: { contains: query, mode: "insensitive" } },
        { features: { contains: query, mode: "insensitive" } },
      ];
    }

    const paints = await this.prisma.paint.findMany({
      where,
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    console.log(`[FilterSearchTool] Encontrados ${paints.length} resultados`);

    return paints.map((paint) => ({
      id: paint.id,
      reason: `Filtro: ${paint.name} - ${paint.color} (${paint.surfaceType}, ${paint.roomType}, ${paint.finish})`,
    }));
  }
}
