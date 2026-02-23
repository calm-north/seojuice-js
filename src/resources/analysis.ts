import type { HttpClient } from "../http.js";
import type { AnalysisRequest, AnalysisResult } from "../types/reports.js";
import { validateDomain, validateId } from "../validate.js";

const MIN_POLL_INTERVAL_MS = 500;

export class AnalysisResource {
  constructor(private readonly http: HttpClient) {}

  async start(domain: string, url: string): Promise<AnalysisRequest> {
    validateDomain(domain);
    return this.http.request<AnalysisRequest>(
      `/websites/${domain}/analyze/`,
      {
        method: "POST",
        body: { url },
      },
    );
  }

  async getStatus(
    domain: string,
    analysisId: string,
  ): Promise<AnalysisResult> {
    validateDomain(domain);
    validateId(analysisId, "analysisId");
    return this.http.request<AnalysisResult>(
      `/websites/${domain}/analyze/${analysisId}/`,
    );
  }

  async waitForCompletion(
    domain: string,
    analysisId: string,
    pollIntervalMs: number = 2000,
    timeoutMs: number = 60000,
  ): Promise<AnalysisResult> {
    const effectiveInterval = Math.max(pollIntervalMs, MIN_POLL_INTERVAL_MS);
    const startTime = Date.now();

    while (true) {
      const result = await this.getStatus(domain, analysisId);

      if (result.status === "completed" || result.status === "failed") {
        return result;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Analysis ${analysisId} did not complete within ${timeoutMs}ms`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, effectiveInterval));
    }
  }
}
