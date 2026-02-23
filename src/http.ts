import {
  APIError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from "./errors.js";

export interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
  timeout: number;
  fetch: typeof globalThis.fetch;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: "json" | "arraybuffer";
}

/**
 * Encode a path segment to prevent path traversal and injection.
 * Allows alphanumeric, hyphens, dots, and underscores (safe for domain names and IDs).
 */
export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/%2F/gi, "");
}

export class HttpClient {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly fetch: typeof globalThis.fetch;

  constructor(config: HttpClientConfig) {
    this.baseURL = config.baseURL.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
    this.fetch = config.fetch;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildURL(path, options.query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const onExternalAbort = () => controller.abort();
    if (options.signal) {
      options.signal.addEventListener("abort", onExternalAbort, {
        once: true,
      });
    }

    const signal = controller.signal;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...options.headers,
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await this.fetch(url.toString(), {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal,
      });

      if (!response.ok) {
        await this.handleError(response, path);
      }

      if (options.responseType === "arraybuffer") {
        return (await response.arrayBuffer()) as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  private buildURL(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): URL {
    const url = new URL(`${this.baseURL}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url;
  }

  private async handleError(response: Response, path: string): Promise<never> {
    const requestId = response.headers.get("x-request-id");
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }

    const bodyObj =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : null;

    const message =
      bodyObj?.message
        ? String(bodyObj.message)
        : bodyObj?.error
          ? String(bodyObj.error)
          : bodyObj?.detail
            ? String(bodyObj.detail)
            : `Request failed with status ${response.status}`;

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message, requestId);
      case 404:
        throw new NotFoundError(message, path, requestId);
      case 429: {
        const retryAfterRaw = response.headers.get("retry-after");
        let retryAfter: number | null = null;
        if (retryAfterRaw) {
          const parsed = parseInt(retryAfterRaw, 10);
          retryAfter = Number.isFinite(parsed) ? parsed : null;
        }
        throw new RateLimitError(message, retryAfter, requestId);
      }
      default:
        throw new APIError(message, response.status, body, requestId);
    }
  }
}
