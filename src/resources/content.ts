import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type {
  ChangeRecord,
  ContentDecayAlert,
  ContentGap,
} from "../types/content.js";
import { validateDomain } from "../validate.js";

export interface ContentGapParams extends PaginationParams {
  category?: string;
  intent?: string;
}

export interface DecayAlertParams extends PaginationParams {
  is_active?: boolean;
  severity?: string;
  decay_type?: string;
}

export interface ChangeParams extends PaginationParams {
  status?: string;
  change_type?: string;
}

export class ContentResource {
  constructor(private readonly http: HttpClient) {}

  async listGaps(
    domain: string,
    params: ContentGapParams = {},
  ): Promise<PaginatedResult<ContentGap>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<ContentGap>>(
      `/websites/${domain}/content-gaps/`,
      { query: { ...params } },
    );
  }

  async listDecayAlerts(
    domain: string,
    params: DecayAlertParams = {},
  ): Promise<PaginatedResult<ContentDecayAlert>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<ContentDecayAlert>>(
      `/websites/${domain}/content-decay/`,
      { query: { ...params } },
    );
  }

  async listChanges(
    domain: string,
    params: ChangeParams = {},
  ): Promise<PaginatedResult<ChangeRecord>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<ChangeRecord>>(
      `/websites/${domain}/changes/`,
      { query: { ...params } },
    );
  }
}
