import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type { ClusterDetail, ClusterSummary } from "../types/clusters.js";
import { validateDomain, validateId } from "../validate.js";

export class ClustersResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<ClusterSummary>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<ClusterSummary>>(
      `/websites/${domain}/clusters/`,
      { query: { ...params } },
    );
  }

  async get(domain: string, clusterId: number): Promise<ClusterDetail> {
    validateDomain(domain);
    validateId(clusterId, "clusterId");
    return this.http.request<ClusterDetail>(
      `/websites/${domain}/clusters/${clusterId}/`,
    );
  }
}
