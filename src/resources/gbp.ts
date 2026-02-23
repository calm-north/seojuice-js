import type { HttpClient } from "../http.js";
import type { PaginatedResult, PaginationParams } from "../types/common.js";
import type {
  GBPLocationsResponse,
  GBPReplyResponse,
  GBPReview,
} from "../types/gbp.js";
import { validateDomain, validateId } from "../validate.js";

export interface GBPReviewParams extends PaginationParams {
  rating?: number;
  sentiment?: string;
  needs_attention?: boolean;
  location_id?: string;
}

export class GBPResource {
  constructor(private readonly http: HttpClient) {}

  async listLocations(domain: string): Promise<GBPLocationsResponse> {
    validateDomain(domain);
    return this.http.request<GBPLocationsResponse>(
      `/websites/${domain}/gbp/locations/`,
    );
  }

  async listReviews(
    domain: string,
    params: GBPReviewParams = {},
  ): Promise<PaginatedResult<GBPReview>> {
    validateDomain(domain);
    return this.http.request<PaginatedResult<GBPReview>>(
      `/websites/${domain}/gbp/reviews/`,
      { query: { ...params } },
    );
  }

  async replyToReview(
    domain: string,
    reviewId: number,
    replyText: string,
  ): Promise<GBPReplyResponse> {
    validateDomain(domain);
    validateId(reviewId, "reviewId");
    return this.http.request<GBPReplyResponse>(
      `/websites/${domain}/gbp/reviews/${reviewId}/reply/`,
      {
        method: "POST",
        body: { reply_text: replyText },
      },
    );
  }
}
