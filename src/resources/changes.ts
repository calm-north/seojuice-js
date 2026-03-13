import type { HttpClient } from "../http.js";
import type { PaginatedResult } from "../types/common.js";
import type {
  BulkActionParams,
  BulkActionResult,
  ChangeListParams,
  ChangeRecord,
  ChangeSettings,
  ChangeStats,
} from "../types/changes.js";
import { validateDomain, validateId } from "../validate.js";

export class ChangesResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: ChangeListParams = {},
  ): Promise<PaginatedResult<ChangeRecord>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<ChangeRecord>>(
      `/websites/${domain}/changes/`,
      { query: { ...params } },
    );
  }

  async get(domain: string, changeId: number): Promise<ChangeRecord> {
    validateDomain(domain);
    validateId(changeId, "changeId");
    return this.http.request<ChangeRecord>(
      `/websites/${domain}/changes/${changeId}/`,
    );
  }

  async stats(domain: string): Promise<ChangeStats> {
    validateDomain(domain);
    return this.http.request<ChangeStats>(
      `/websites/${domain}/changes/stats/`,
    );
  }

  async settings(domain: string): Promise<ChangeSettings> {
    validateDomain(domain);
    return this.http.request<ChangeSettings>(
      `/websites/${domain}/changes/settings/`,
    );
  }

  async approve(domain: string, changeId: number): Promise<ChangeRecord> {
    validateDomain(domain);
    validateId(changeId, "changeId");
    return this.http.request<ChangeRecord>(
      `/websites/${domain}/changes/${changeId}/approve/`,
      { method: "POST" },
    );
  }

  async reject(
    domain: string,
    changeId: number,
    params?: { reason?: string },
  ): Promise<ChangeRecord> {
    validateDomain(domain);
    validateId(changeId, "changeId");
    return this.http.request<ChangeRecord>(
      `/websites/${domain}/changes/${changeId}/reject/`,
      { method: "POST", body: params },
    );
  }

  async revert(
    domain: string,
    changeId: number,
    params?: { reason?: string },
  ): Promise<ChangeRecord> {
    validateDomain(domain);
    validateId(changeId, "changeId");
    return this.http.request<ChangeRecord>(
      `/websites/${domain}/changes/${changeId}/revert/`,
      { method: "POST", body: params },
    );
  }

  async pull(
    domain: string,
    changeId: number,
    params: { integration: string },
  ): Promise<ChangeRecord> {
    validateDomain(domain);
    validateId(changeId, "changeId");
    return this.http.request<ChangeRecord>(
      `/websites/${domain}/changes/${changeId}/pull/`,
      { method: "POST", body: params },
    );
  }

  async verify(
    domain: string,
    changeId: number,
    params: { integration: string },
  ): Promise<ChangeRecord> {
    validateDomain(domain);
    validateId(changeId, "changeId");
    return this.http.request<ChangeRecord>(
      `/websites/${domain}/changes/${changeId}/verify/`,
      { method: "POST", body: params },
    );
  }

  async bulk(
    domain: string,
    params: BulkActionParams,
  ): Promise<BulkActionResult> {
    validateDomain(domain);
    return this.http.request<BulkActionResult>(
      `/websites/${domain}/changes/bulk/`,
      { method: "POST", body: params },
    );
  }

  async updateSettings(
    domain: string,
    settings: Partial<ChangeSettings>,
  ): Promise<ChangeSettings> {
    validateDomain(domain);
    return this.http.request<ChangeSettings>(
      `/websites/${domain}/changes/settings/`,
      { method: "PATCH", body: settings },
    );
  }
}
