import type { HttpClient } from "../http.js";
import type { SimilarPagesResponse } from "../types/similar.js";
import { validateDomain } from "../validate.js";

export interface SimilarPagesParams {
  url: string;
  limit?: number;
}

export class SimilarResource {
  constructor(private readonly http: HttpClient) {}

  async find(
    domain: string,
    params: SimilarPagesParams,
  ): Promise<SimilarPagesResponse> {
    validateDomain(domain);
    return this.http.request<SimilarPagesResponse>(
      `/websites/${domain}/similar/`,
      { query: { ...params } },
    );
  }
}
