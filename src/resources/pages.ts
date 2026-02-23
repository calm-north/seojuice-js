import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams, Period } from "../types/common.js";
import type { PageKeyword } from "../types/keywords.js";
import type { MetricsHistory, PageSummary, SearchStat } from "../types/pages.js";
import { validateDomain, validateId } from "../validate.js";

export interface SearchStatsParams extends PaginationParams {
  period?: Period;
}

export interface MetricsHistoryParams extends PaginationParams {
  period?: Period;
}

export class PagesResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<PageSummary>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<PageSummary>>(
      `/websites/${domain}/pages/`,
      { query: { ...params } },
    );
  }

  async get(domain: string, pageId: number | string): Promise<PageSummary> {
    validateDomain(domain);
    validateId(pageId, "pageId");
    return this.http.request<PageSummary>(
      `/websites/${domain}/pages/${pageId}/`,
    );
  }

  async listKeywords(
    domain: string,
    pageId: number | string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<PageKeyword>> {
    validateDomain(domain);
    validateId(pageId, "pageId");
    return this.http.request<PaginatedResult<PageKeyword>>(
      `/websites/${domain}/pages/${pageId}/keywords/`,
      { query: { ...params } },
    );
  }

  async listSearchStats(
    domain: string,
    pageId: number | string,
    params: SearchStatsParams = {},
  ): Promise<PaginatedResult<SearchStat>> {
    validateDomain(domain);
    validateId(pageId, "pageId");
    return this.http.request<PaginatedResult<SearchStat>>(
      `/websites/${domain}/pages/${pageId}/search-stats/`,
      { query: { ...params } },
    );
  }

  async listMetricsHistory(
    domain: string,
    pageId: number | string,
    params: MetricsHistoryParams = {},
  ): Promise<PaginatedResult<MetricsHistory>> {
    validateDomain(domain);
    validateId(pageId, "pageId");
    return this.http.request<PaginatedResult<MetricsHistory>>(
      `/websites/${domain}/pages/${pageId}/metrics-history/`,
      { query: { ...params } },
    );
  }
}
