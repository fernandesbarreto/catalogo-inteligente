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

    // Aplicar filtros específicos no SQL quando existirem
    if (filters?.surfaceType) {
      where.surfaceType = {
        contains: filters.surfaceType,
        mode: "insensitive",
      };
    }
    if (filters?.roomType) {
      where.roomType = {
        contains: filters.roomType,
        mode: "insensitive",
      };
    }
    if (filters?.finish) {
      where.finish = {
        contains: filters.finish,
        mode: "insensitive",
      };
    }
    if (filters?.line) {
      where.line = {
        contains: filters.line,
        mode: "insensitive",
      };
    }

    // Busca por texto nos campos relevantes
    if (query.trim()) {
      const queryLower = query.toLowerCase();

      // Mapeamento de cores para incluir variações e sinônimos
      const colorMappings: { [key: string]: string[] } = {
        branco: ["branco", "white"],
        branca: ["branca", "white", "branco"], // Include masculine form
        white: ["white", "branco", "branca"],
        preto: ["preto", "black"],
        preta: ["preta", "black"],
        black: ["black", "preto", "preta"],
        azul: ["azul", "blue", "anil", "ciano"],
        blue: ["blue", "azul", "anil", "ciano"],
        vermelho: ["vermelho", "red", "vermelha"],
        red: ["red", "vermelho", "vermelha"],
        verde: ["verde", "green", "esmeralda", "jade"],
        green: ["green", "verde", "esmeralda", "jade"],
        amarelo: ["amarelo", "yellow", "amarela"],
        yellow: ["yellow", "amarelo", "amarela"],
        rosa: ["rosa", "pink"],
        pink: ["pink", "rosa"],
        cinza: ["cinza", "gray", "grey"],
        gray: ["gray", "cinza"],
        grey: ["grey", "cinza"],
        marrom: ["marrom", "brown", "bronze"],
        brown: ["brown", "marrom", "bronze"],
        laranja: ["laranja", "orange", "âmbar"],
        orange: ["orange", "laranja", "âmbar"],
        roxo: ["roxo", "purple", "violeta"],
        purple: ["purple", "roxo", "violeta"],
        bege: ["bege", "beige"],
        beige: ["beige", "bege"],
      };

      // Encontrar mapeamento de cores para a query
      let colorVariations: string[] = [];
      for (const [colorKey, variations] of Object.entries(colorMappings)) {
        if (queryLower.includes(colorKey)) {
          colorVariations = variations;
          break;
        }
      }

      // Se encontramos variações de cor, priorizar busca por cor
      if (colorVariations.length > 0) {
        where.OR = colorVariations.map((color) => ({
          color: {
            contains: color,
            mode: "insensitive",
          },
        }));
      } else {
        // Busca direta por cor se não houver mapeamento
        where.OR = [
          { color: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { features: { contains: query, mode: "insensitive" } },
        ];
      }
    }

    // Se não há query mas há filtros, buscar apenas por filtros
    if (!query.trim() && filters && Object.keys(filters).length > 0) {
      console.log(`[FilterSearchTool] Buscando apenas por filtros:`, filters);
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
