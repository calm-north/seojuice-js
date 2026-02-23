import type { HttpClient } from "../http.js";
import type { Period } from "../types/common.js";
import type {
  IntelligenceSummary,
  PageSpeed,
  Topology,
} from "../types/intelligence.js";
import { validateDomain } from "../validate.js";

export interface IntelligenceSummaryParams {
  period?: Period;
  include_history?: boolean;
  include_trends?: boolean;
}

export interface PageSpeedParams {
  url: string;
}

export class IntelligenceResource {
  constructor(private readonly http: HttpClient) {}

  async getSummary(
    domain: string,
    params: IntelligenceSummaryParams = {},
  ): Promise<IntelligenceSummary> {
    validateDomain(domain);
    return this.http.request<IntelligenceSummary>(
      `/websites/${domain}/intelligence/`,
      { query: { ...params } },
    );
  }

  async getTopology(domain: string): Promise<Topology> {
    validateDomain(domain);
    return this.http.request<Topology>(
      `/websites/${domain}/topology/`,
    );
  }

  async getPageSpeed(
    domain: string,
    params: PageSpeedParams,
  ): Promise<PageSpeed> {
    validateDomain(domain);
    return this.http.request<PageSpeed>(
      `/websites/${domain}/pagespeed/`,
      { query: { ...params } },
    );
  }
}
