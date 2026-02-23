import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type { Link } from "../types/pages.js";
import { validateDomain } from "../validate.js";

export class LinksResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<Link>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<Link>>(
      `/websites/${domain}/links/`,
      { query: { ...params } },
    );
  }
}
