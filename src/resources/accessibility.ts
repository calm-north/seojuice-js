import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type { AccessibilityIssue } from "../types/accessibility.js";
import { validateDomain } from "../validate.js";

export interface AccessibilityParams extends PaginationParams {
  severity?: string;
  category?: string;
  auto_fixable?: boolean;
}

export class AccessibilityResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: AccessibilityParams = {},
  ): Promise<PaginatedResult<AccessibilityIssue>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<AccessibilityIssue>>(
      `/websites/${domain}/accessibility-issues/`,
      { query: { ...params } },
    );
  }
}
