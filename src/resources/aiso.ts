import type { HttpClient } from "../http.js";
import type { Period } from "../types/common.js";
import type { AISO } from "../types/aiso.js";
import { validateDomain } from "../validate.js";

export interface AISOParams {
  period?: Period;
  include_history?: boolean;
}

export class AISOResource {
  constructor(private readonly http: HttpClient) {}

  async get(domain: string, params: AISOParams = {}): Promise<AISO> {
    validateDomain(domain);
    return this.http.request<AISO>(`/websites/${domain}/aiso/`, {
      query: { ...params },
    });
  }
}
