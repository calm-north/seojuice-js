import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type {
  ReportCreate,
  ReportDetail,
  ReportSummary,
} from "../types/reports.js";
import { validateDomain, validateId } from "../validate.js";

export class ReportsResource {
  constructor(private readonly http: HttpClient) {}

  async list(
    domain: string,
    params: PaginationParams = {},
  ): Promise<PaginatedResult<ReportSummary>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<ReportSummary>>(
      `/websites/${domain}/reports/`,
      { query: { ...params } },
    );
  }

  async get(domain: string, reportId: number): Promise<ReportDetail> {
    validateDomain(domain);
    validateId(reportId, "reportId");
    return this.http.request<ReportDetail>(
      `/websites/${domain}/reports/${reportId}/`,
    );
  }

  async create(
    domain: string,
    options: { type: string },
  ): Promise<ReportCreate> {
    validateDomain(domain);
    return this.http.request<ReportCreate>(`/websites/${domain}/reports/`, {
      method: "POST",
      body: options,
    });
  }

  async downloadPdf(domain: string, reportId: number): Promise<ArrayBuffer> {
    validateDomain(domain);
    validateId(reportId, "reportId");
    return this.http.request<ArrayBuffer>(
      `/websites/${domain}/reports/${reportId}/pdf/`,
      { responseType: "arraybuffer" },
    );
  }
}
