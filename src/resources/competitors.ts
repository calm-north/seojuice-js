import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type { Competitor } from "../types/competitors.js";
import { validateDomain } from "../validate.js";

export interface CompetitorParams extends PaginationParams {
  include_trends?: boolean;
}

export class CompetitorsResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: CompetitorParams = {},
  ): Promise<PaginatedResult<Competitor>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<Competitor>>(
      `/websites/${domain}/competitors/`,
      { query: { ...params } },
    );
  }
}
