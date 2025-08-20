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
    const offset = (filters as any)?.offset ?? 0;

    // Apply specific filters in SQL when they exist
    const filterConditions: any[] = [];

    if (filters?.surfaceType) {
      filterConditions.push({
        surfaceType: {
          contains: filters.surfaceType,
          mode: "insensitive",
        },
      });
    }
    if (filters?.roomType) {
      filterConditions.push({
        roomType: {
          contains: filters.roomType,
          mode: "insensitive",
        },
      });
    }
    if (filters?.finish) {
      filterConditions.push({
        finish: {
          contains: filters.finish,
          mode: "insensitive",
        },
      });
    }
    if (filters?.line) {
      filterConditions.push({
        line: {
          contains: filters.line,
          mode: "insensitive",
        },
      });
    }
    if ((filters as any)?.color) {
      const color = (filters as any).color as string;
      const colorLower = color.toLowerCase();

      // Color mapping to include variations and synonyms
      const colorMappings = this.getColorMappings();

      // Check if there are color variations to expand the search
      let colorVariations: string[] = [];
      for (const [colorKey, variations] of Object.entries(colorMappings)) {
        if (colorLower === colorKey || variations.includes(colorLower)) {
          colorVariations = variations;
          break;
        }
      }

      if (colorVariations.length > 0) {
        // Use color variations for broader search
        filterConditions.push({
          OR: colorVariations.map((colorVar) => ({
            color: {
              contains: colorVar,
              mode: "insensitive",
            },
          })),
        });
      } else {
        // Direct search if no variations
        filterConditions.push({
          color: {
            contains: color,
            mode: "insensitive",
          },
        });
      }
    }

    // Text search in relevant fields
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      const queryWords = queryLower
        .split(/\s+/)
        .filter((word) => word.length > 0);

      // Find color mapping for query (fallback)
      let colorVariations: string[] = [];
      if (!(filters as any)?.color) {
        // Use the same color mapping as above
        const colorMappings = this.getColorMappings();

        for (const [colorKey, variations] of Object.entries(colorMappings)) {
          if (queryLower.includes(colorKey)) {
            colorVariations = variations as string[];
            break;
          }
        }
      }

      // Build broader search conditions
      const searchConditions = [];

      // If we found color variations, add color search
      if (colorVariations.length > 0) {
        searchConditions.push(
          ...colorVariations.map((color) => ({
            color: {
              contains: color,
              mode: "insensitive",
            },
          }))
        );
      }

      // Search for each word individually in all relevant fields
      for (const word of queryWords) {
        searchConditions.push(
          { name: { contains: word, mode: "insensitive" } },
          { features: { contains: word, mode: "insensitive" } },
          { roomType: { contains: word, mode: "insensitive" } },
          { surfaceType: { contains: word, mode: "insensitive" } },
          { finish: { contains: word, mode: "insensitive" } },
          { line: { contains: word, mode: "insensitive" } }
        );
      }

      // If there are no specific color variations, also search by direct color
      if (colorVariations.length === 0) {
        for (const word of queryWords) {
          searchConditions.push({
            color: { contains: word, mode: "insensitive" },
          });
        }
      }

      // Combine filters with search conditions
      if (filterConditions.length > 0) {
        // If there are filters, use AND to combine filters with OR of search conditions
        where.AND = [{ OR: searchConditions }, ...filterConditions];
      } else {
        // If there are no filters, use only OR for search conditions
        where.OR = searchConditions;
      }
    }

    // If there's no query but there are filters, search only by filters
    if (!query.trim() && filterConditions.length > 0) {
      console.log(`[FilterSearchTool] Searching only by filters:`, filters);
      where.AND = filterConditions;
    }

    const paints = await this.prisma.paint.findMany({
      where,
      take: 10,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    console.log(`[FilterSearchTool] Found ${paints.length} results`);

    let picks = paints.map((paint) => ({
      id: paint.id,
      reason: `Filter: ${paint.name} - ${paint.color} (${paint.surfaceType}, ${paint.roomType}, ${paint.finish})`,
    }));

    // Exclude already seen IDs (if sent)
    const exclude = ((filters as any)?.excludeIds as string[]) || [];
    if (exclude.length > 0) {
      const excl = new Set(exclude);
      picks = picks.filter((p) => !excl.has(p.id));
    }

    return picks;
  }

  private getColorMappings(): { [key: string]: string[] } {
    return {
      // Whites
      branco: ["branco", "white", "branca"],
      branca: ["branca", "white", "branco"],
      white: ["white", "branco", "branca"],

      // Blacks
      preto: ["preto", "black", "preta"],
      preta: ["preta", "black", "preto"],
      black: ["black", "preto", "preta"],

      // Blues and variations
      azul: [
        "azul",
        "blue",
        "anil",
        "ciano",
        "céu",
        "aqua",
        "turquesa",
        "índigo",
      ],
      blue: [
        "blue",
        "azul",
        "anil",
        "ciano",
        "céu",
        "aqua",
        "turquesa",
        "índigo",
      ],
      anil: ["anil", "azul", "blue", "ciano", "índigo"],
      ciano: ["ciano", "azul", "blue", "anil", "aqua"],
      céu: ["céu", "azul", "blue", "ciano"],
      aqua: ["aqua", "azul", "blue", "ciano", "turquesa"],
      turquesa: ["turquesa", "azul", "blue", "aqua"],
      índigo: ["índigo", "azul", "blue", "anil"],

      // Reds and variations
      vermelho: ["vermelho", "red", "vermelha", "coral", "vinho", "salmão"],
      red: ["red", "vermelho", "vermelha", "coral", "vinho", "salmão"],
      vermelha: ["vermelha", "red", "vermelho", "coral", "vinho"],
      coral: ["coral", "vermelho", "red", "salmão"],
      vinho: ["vinho", "vermelho", "red", "coral"],
      salmão: ["salmão", "vermelho", "red", "coral"],

      // Greens and variations
      verde: [
        "verde",
        "green",
        "esmeralda",
        "jade",
        "oliva",
        "lima",
        "turmalina",
      ],
      green: [
        "green",
        "verde",
        "esmeralda",
        "jade",
        "oliva",
        "lima",
        "turmalina",
      ],
      esmeralda: ["esmeralda", "verde", "green", "jade"],
      jade: ["jade", "verde", "green", "esmeralda"],
      oliva: ["oliva", "verde", "green"],
      lima: ["lima", "verde", "green"],
      turmalina: ["turmalina", "verde", "green"],

      // Yellows and variations
      amarelo: ["amarelo", "yellow", "amarela", "âmbar", "mostarda", "dourado"],
      yellow: ["yellow", "amarelo", "amarela", "âmbar", "mostarda", "dourado"],
      amarela: ["amarela", "yellow", "amarelo", "âmbar", "mostarda"],
      âmbar: ["âmbar", "amarelo", "yellow", "mostarda", "dourado"],
      mostarda: ["mostarda", "amarelo", "yellow", "âmbar"],
      dourado: ["dourado", "amarelo", "yellow", "âmbar"],

      // Purples and variations
      roxo: ["roxo", "purple", "violeta", "fúcsia", "ameixa"],
      purple: ["purple", "roxo", "violeta", "fúcsia", "ameixa"],
      violeta: ["violeta", "roxo", "purple", "fúcsia"],
      fúcsia: ["fúcsia", "roxo", "purple", "violeta", "ameixa"],
      ameixa: ["ameixa", "roxo", "purple", "fúcsia"],

      // Oranges and variations
      laranja: ["laranja", "orange", "terracota", "cobre"],
      orange: ["orange", "laranja", "terracota", "cobre"],
      terracota: ["terracota", "laranja", "orange"],
      cobre: ["cobre", "laranja", "orange"],

      // Browns and variations
      marrom: ["marrom", "brown", "bronze"],
      brown: ["brown", "marrom", "bronze"],
      bronze: ["bronze", "marrom", "brown"],

      // Beiges
      bege: ["bege", "beige"],
      beige: ["beige", "bege"],

      // Grays and variations
      cinza: ["cinza", "gray", "grey", "grafite"],
      gray: ["gray", "cinza", "grey", "grafite"],
      grey: ["grey", "cinza", "gray", "grafite"],
      grafite: ["grafite", "cinza", "gray", "grey"],

      // Pink
      rosa: ["rosa", "pink"],
      pink: ["pink", "rosa"],
    };
  }
}
