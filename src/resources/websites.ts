import type { HttpClient } from "../http.js";
import type { WebsiteDetail, WebsiteListResponse } from "../types/websites.js";
import { validateDomain } from "../validate.js";

export class WebsitesResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<WebsiteListResponse> {
    return this.http.request<WebsiteListResponse>("/websites/");
  }

  async get(domain: string): Promise<WebsiteDetail> {
    validateDomain(domain);
    return this.http.request<WebsiteDetail>(`/websites/${domain}/`);
  }
}
