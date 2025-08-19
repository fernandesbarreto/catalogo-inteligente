import { RecommendationPick } from "../../interface/http/bff/dto/ai.dto";

export interface SearchFilters {
  surfaceType?: string;
  roomType?: string;
  finish?: string;
  line?: string;
  offset?: number;
}

export interface ISearchTool {
  name: string;
  execute(
    query: string,
    filters?: SearchFilters
  ): Promise<RecommendationPick[]>;
}
