import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type { Keyword } from "../types/keywords.js";
import { validateDomain } from "../validate.js";

export interface KeywordParams extends PaginationParams {
  category?: string;
  /** Adds `serp_features` and `serp_enrichment` to every keyword. */
  include_serp?: boolean;
}

export class KeywordsResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: KeywordParams = {},
  ): Promise<PaginatedResult<Keyword>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<Keyword>>(
      `/websites/${domain}/keywords/`,
      { query: { ...params } },
    );
  }
}
