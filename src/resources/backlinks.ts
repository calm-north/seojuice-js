import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type { Backlink, BacklinkDomain } from "../types/backlinks.js";
import { validateDomain } from "../validate.js";

export interface BacklinkParams extends PaginationParams {
  status?: string;
  dofollow?: boolean;
}

export class BacklinksResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: BacklinkParams = {},
  ): Promise<PaginatedResult<Backlink>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<Backlink>>(
      `/websites/${domain}/backlinks/`,
      { query: { ...params } },
    );
  }

  async listDomains(
    domain: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<BacklinkDomain>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<BacklinkDomain>>(
      `/websites/${domain}/backlink-domains/`,
      { query: { ...params } },
    );
  }
}
