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

    // Aplicar filtros específicos no SQL quando existirem
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

      // Mapeamento de cores para incluir variações e sinônimos
      const colorMappings: { [key: string]: string[] } = {
        // Brancos
        branco: ["branco", "white", "branca"],
        branca: ["branca", "white", "branco"],
        white: ["white", "branco", "branca"],

        // Pretos
        preto: ["preto", "black", "preta"],
        preta: ["preta", "black", "preto"],
        black: ["black", "preto", "preta"],

        // Azuis e variações
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

        // Vermelhos e variações
        vermelho: ["vermelho", "red", "vermelha", "coral", "vinho", "salmão"],
        red: ["red", "vermelho", "vermelha", "coral", "vinho", "salmão"],
        vermelha: ["vermelha", "red", "vermelho", "coral", "vinho"],
        coral: ["coral", "vermelho", "red", "salmão"],
        vinho: ["vinho", "vermelho", "red", "coral"],
        salmão: ["salmão", "vermelho", "red", "coral"],

        // Verdes e variações
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

        // Amarelos e variações
        amarelo: [
          "amarelo",
          "yellow",
          "amarela",
          "âmbar",
          "mostarda",
          "dourado",
        ],
        yellow: [
          "yellow",
          "amarelo",
          "amarela",
          "âmbar",
          "mostarda",
          "dourado",
        ],
        amarela: ["amarela", "yellow", "amarelo", "âmbar", "mostarda"],
        âmbar: ["âmbar", "amarelo", "yellow", "mostarda", "dourado"],
        mostarda: ["mostarda", "amarelo", "yellow", "âmbar"],
        dourado: ["dourado", "amarelo", "yellow", "âmbar"],

        // Roxos e variações
        roxo: ["roxo", "purple", "violeta", "fúcsia", "ameixa"],
        purple: ["purple", "roxo", "violeta", "fúcsia", "ameixa"],
        violeta: ["violeta", "roxo", "purple", "fúcsia"],
        fúcsia: ["fúcsia", "roxo", "purple", "violeta", "ameixa"],
        ameixa: ["ameixa", "roxo", "purple", "fúcsia"],

        // Laranjas e variações
        laranja: ["laranja", "orange", "terracota", "cobre"],
        orange: ["orange", "laranja", "terracota", "cobre"],
        terracota: ["terracota", "laranja", "orange"],
        cobre: ["cobre", "laranja", "orange"],

        // Marrons e variações
        marrom: ["marrom", "brown", "bronze"],
        brown: ["brown", "marrom", "bronze"],
        bronze: ["bronze", "marrom", "brown"],

        // Beges
        bege: ["bege", "beige"],
        beige: ["beige", "bege"],

        // Cinzas e variações
        cinza: ["cinza", "gray", "grey", "grafite"],
        gray: ["gray", "cinza", "grey", "grafite"],
        grey: ["grey", "cinza", "gray", "grafite"],
        grafite: ["grafite", "cinza", "gray", "grey"],

        // Rosa
        rosa: ["rosa", "pink"],
        pink: ["pink", "rosa"],
      };

      // Verificar se há variações de cor para expandir a busca
      let colorVariations: string[] = [];
      for (const [colorKey, variations] of Object.entries(colorMappings)) {
        if (colorLower === colorKey || variations.includes(colorLower)) {
          colorVariations = variations;
          break;
        }
      }

      if (colorVariations.length > 0) {
        // Usar variações de cor para busca mais abrangente
        filterConditions.push({
          OR: colorVariations.map((colorVar) => ({
            color: {
              contains: colorVar,
              mode: "insensitive",
            },
          })),
        });
      } else {
        // Busca direta se não há variações
        filterConditions.push({
          color: {
            contains: color,
            mode: "insensitive",
          },
        });
      }
    }

    // Busca por texto nos campos relevantes
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      const queryWords = queryLower
        .split(/\s+/)
        .filter((word) => word.length > 0);

      // Encontrar mapeamento de cores para a query (fallback)
      let colorVariations: string[] = [];
      if (!(filters as any)?.color) {
        // Mapeamento de cores para incluir variações e sinônimos
        const colorMappings: { [key: string]: string[] } = {
          // Brancos
          branco: ["branco", "white", "branca"],
          branca: ["branca", "white", "branco"],
          white: ["white", "branco", "branca"],

          // Pretos
          preto: ["preto", "black", "preta"],
          preta: ["preta", "black", "preto"],
          black: ["black", "preto", "preta"],

          // Azuis e variações
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

          // Vermelhos e variações
          vermelho: ["vermelho", "red", "vermelha", "coral", "vinho", "salmão"],
          red: ["red", "vermelho", "vermelha", "coral", "vinho", "salmão"],
          vermelha: ["vermelha", "red", "vermelho", "coral", "vinho"],
          coral: ["coral", "vermelho", "red", "salmão"],
          vinho: ["vinho", "vermelho", "red", "coral"],
          salmão: ["salmão", "vermelho", "red", "coral"],

          // Verdes e variações
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

          // Amarelos e variações
          amarelo: [
            "amarelo",
            "yellow",
            "amarela",
            "âmbar",
            "mostarda",
            "dourado",
          ],
          yellow: [
            "yellow",
            "amarelo",
            "amarela",
            "âmbar",
            "mostarda",
            "dourado",
          ],
          amarela: ["amarela", "yellow", "amarelo", "âmbar", "mostarda"],
          âmbar: ["âmbar", "amarelo", "yellow", "mostarda", "dourado"],
          mostarda: ["mostarda", "amarelo", "yellow", "âmbar"],
          dourado: ["dourado", "amarelo", "yellow", "âmbar"],

          // Roxos e variações
          roxo: ["roxo", "purple", "violeta", "fúcsia", "ameixa"],
          purple: ["purple", "roxo", "violeta", "fúcsia", "ameixa"],
          violeta: ["violeta", "roxo", "purple", "fúcsia"],
          fúcsia: ["fúcsia", "roxo", "purple", "violeta", "ameixa"],
          ameixa: ["ameixa", "roxo", "purple", "fúcsia"],

          // Laranjas e variações
          laranja: ["laranja", "orange", "terracota", "cobre"],
          orange: ["orange", "laranja", "terracota", "cobre"],
          terracota: ["terracota", "laranja", "orange"],
          cobre: ["cobre", "laranja", "orange"],

          // Marrons e variações
          marrom: ["marrom", "brown", "bronze"],
          brown: ["brown", "marrom", "bronze"],
          bronze: ["bronze", "marrom", "brown"],

          // Beges
          bege: ["bege", "beige"],
          beige: ["beige", "bege"],

          // Cinzas e variações
          cinza: ["cinza", "gray", "grey", "grafite"],
          gray: ["gray", "cinza", "grey", "grafite"],
          grey: ["grey", "cinza", "gray", "grafite"],
          grafite: ["grafite", "cinza", "gray", "grey"],

          // Rosa
          rosa: ["rosa", "pink"],
          pink: ["pink", "rosa"],
        };

        for (const [colorKey, variations] of Object.entries(colorMappings)) {
          if (queryLower.includes(colorKey)) {
            colorVariations = variations;
            break;
          }
        }
      }

      // Construir condições de busca mais abrangentes
      const searchConditions = [];

      // Se encontramos variações de cor, adicionar busca por cor
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

      // Buscar por cada palavra individualmente em todos os campos relevantes
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

      // Se não há variações de cor específicas, também buscar por cor direta
      if (colorVariations.length === 0) {
        for (const word of queryWords) {
          searchConditions.push({
            color: { contains: word, mode: "insensitive" },
          });
        }
      }

      // Combinar filtros com condições de busca
      if (filterConditions.length > 0) {
        // Se há filtros, usar AND para combinar filtros com OR das condições de busca
        where.AND = [{ OR: searchConditions }, ...filterConditions];
      } else {
        // Se não há filtros, usar apenas OR para as condições de busca
        where.OR = searchConditions;
      }
    }

    // Se não há query mas há filtros, buscar apenas por filtros
    if (!query.trim() && filterConditions.length > 0) {
      console.log(`[FilterSearchTool] Buscando apenas por filtros:`, filters);
      where.AND = filterConditions;
    }

    const paints = await this.prisma.paint.findMany({
      where,
      take: 10,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });

    console.log(`[FilterSearchTool] Encontrados ${paints.length} resultados`);

    let picks = paints.map((paint) => ({
      id: paint.id,
      reason: `Filtro: ${paint.name} - ${paint.color} (${paint.surfaceType}, ${paint.roomType}, ${paint.finish})`,
    }));

    // Excluir IDs já vistos (se enviados)
    const exclude = ((filters as any)?.excludeIds as string[]) || [];
    if (exclude.length > 0) {
      const excl = new Set(exclude);
      picks = picks.filter((p) => !excl.has(p.id));
    }

    return picks;
  }
}
