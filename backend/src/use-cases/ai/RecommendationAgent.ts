import {
  ISearchTool,
  SearchFilters,
} from "../../domain/repositories/ISearchTool";
import {
  RecommendationQuery,
  RecommendationResponse,
} from "../../interface/http/bff/dto/ai.dto";
import { MCPAdapter } from "../../infra/mcp/MCPAdapter";

interface RankedPick {
  id: string;
  reason: string;
  filterRank?: number;
  semanticRank?: number;
  rrfScore?: number;
}

export class RecommendationAgent {
  constructor(
    private filterSearchTool: ISearchTool,
    private semanticSearchTool: ISearchTool,
    private mcpAdapter: MCPAdapter = new MCPAdapter()
  ) {}

  async execute(query: RecommendationQuery): Promise<RecommendationResponse> {
    console.log(
      `[RecommendationAgent] Iniciando recomendação híbrida para: "${query.query}"`
    );

    const startTime = Date.now();

    try {
      // Execute both searches in parallel
      const [filterPicks, semanticPicks] = await Promise.all([
        this.filterSearchTool.execute(query.query, query.filters),
        this.semanticSearchTool.execute(query.query, query.filters),
      ]);

      console.log(
        `[RecommendationAgent] Filter: ${filterPicks.length}, Semantic: ${semanticPicks.length}`
      );

      // Combine results using RRF (Reciprocal Rank Fusion)
      const combinedPicks = this.combineWithRRF(filterPicks, semanticPicks);

      // Try MCP if enabled
      let mcpPicks: any[] = [];
      if (this.mcpAdapter.isMCPEnabled()) {
        console.log(`[RecommendationAgent] Trying MCP for enrichment`);
        const mcpResponse = await this.mcpAdapter.processRecommendation({
          query: query.query,
          context: {
            filters: query.filters,
            approach: "hybrid",
            filterResults: filterPicks.length,
            semanticResults: semanticPicks.length,
          },
        });
        if (mcpResponse) {
          mcpPicks = mcpResponse.picks;
          console.log(
            `[RecommendationAgent] MCP returned ${mcpPicks.length} results`
          );
        }
      }

      // Add MCP results (without RRF, just append)
      const allPicks = [...combinedPicks, ...mcpPicks];

      // Remove duplicates by ID and limit to 5
      const uniquePicks = this.removeDuplicates(allPicks).slice(0, 5);

      const executionTime = Date.now() - startTime;
      console.log(
        `[RecommendationAgent] Hybrid recommendation completed in ${executionTime}ms. ${uniquePicks.length} final results`
      );

      // Guard-rail: If there are no valid results, return empty picks
      if (uniquePicks.length === 0) {
        console.log(`[RecommendationAgent] No valid results found`);
        return {
          picks: [],
          notes: this.generateNotes(query.query, 0, "hybrid"),
        };
      }

      return {
        picks: uniquePicks.map((pick) => ({
          id: pick.id,
          reason: pick.reason,
        })),
        notes: this.generateNotes(
          query.query,
          uniquePicks.length,
          "hybrid",
          filterPicks.length,
          semanticPicks.length
        ),
      };
    } catch (error) {
      console.error(`[RecommendationAgent] Error in recommendation:`, error);
      return {
        picks: [],
        notes: "Error processing recommendation. Please try again.",
      };
    }
  }

  private combineWithRRF(
    filterPicks: any[],
    semanticPicks: any[]
  ): RankedPick[] {
    const k = 60; // RRF parameter (default)
    const combinedMap = new Map<string, RankedPick>();

    // Process filter results
    filterPicks.forEach((pick, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (rank + k);

      combinedMap.set(pick.id, {
        id: pick.id,
        reason: pick.reason,
        filterRank: rank,
        rrfScore,
      });
    });

    // Process semantic results and combine
    semanticPicks.forEach((pick, index) => {
      const rank = index + 1;
      const semanticRRF = 1 / (rank + k);

      if (combinedMap.has(pick.id)) {
        // Item already exists in filter - sum RRF scores
        const existing = combinedMap.get(pick.id)!;
        existing.semanticRank = rank;
        existing.rrfScore = (existing.rrfScore || 0) + semanticRRF;

        // Update reason to indicate it was found in both searches
        existing.reason = `${existing.reason} + Semantic (rank ${rank})`;
      } else {
        // Item only exists in semantic search
        combinedMap.set(pick.id, {
          id: pick.id,
          reason: pick.reason,
          semanticRank: rank,
          rrfScore: semanticRRF,
        });
      }
    });

    // Convert to array and sort by RRF score (descending)
    const combinedArray = Array.from(combinedMap.values());
    combinedArray.sort((a, b) => (b.rrfScore || 0) - (a.rrfScore || 0));

    return combinedArray;
  }

  private removeDuplicates(picks: any[]): any[] {
    const seen = new Set();
    return picks.filter((pick) => {
      if (seen.has(pick.id)) {
        return false;
      }
      seen.add(pick.id);
      return true;
    });
  }

  private generateNotes(
    query: string,
    resultCount: number,
    approach: string,
    filterCount?: number,
    semanticCount?: number
  ): string {
    if (resultCount === 0) {
      return "No paint found with the specified criteria. Try adjusting your search.";
    }

    if (
      approach === "hybrid" &&
      filterCount !== undefined &&
      semanticCount !== undefined
    ) {
      return `Found ${resultCount} paints using hybrid search (${filterCount} filters + ${semanticCount} semantic). Results ordered by combined relevance.`;
    }

    return `Found ${resultCount} paints. For more options, refine your query.`;
  }
}
