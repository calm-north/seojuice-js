export type APIErrorCode =
  | "authentication_error"
  | "not_found"
  | "rate_limit_exceeded"
  | "api_error"
  | "timeout"
  | "network_error";

export class SEOJuiceError extends Error {
  readonly code: APIErrorCode;
  readonly status: number;
  readonly requestId: string | null;

  constructor(
    message: string,
    code: APIErrorCode,
    status: number,
    requestId: string | null = null,
  ) {
    super(message);
    this.name = "SEOJuiceError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export class AuthenticationError extends SEOJuiceError {
  constructor(message: string, requestId: string | null = null) {
    super(message, "authentication_error", 401, requestId);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends SEOJuiceError {
  readonly resource: string;

  constructor(
    message: string,
    resource: string,
    requestId: string | null = null,
  ) {
    super(message, "not_found", 404, requestId);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}

export class RateLimitError extends SEOJuiceError {
  readonly retryAfter: number | null;

  constructor(
    message: string,
    retryAfter: number | null = null,
    requestId: string | null = null,
  ) {
    super(message, "rate_limit_exceeded", 429, requestId);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class APIError extends SEOJuiceError {
  readonly body: unknown;

  constructor(
    message: string,
    status: number,
    body: unknown = null,
    requestId: string | null = null,
  ) {
    super(message, "api_error", status, requestId);
    this.name = "APIError";
    this.body = body;
  }
}

export class TimeoutError extends SEOJuiceError {
  constructor(message: string, requestId: string | null = null) {
    super(message, "timeout", 0, requestId);
    this.name = "TimeoutError";
  }
}

export class NetworkError extends SEOJuiceError {
  readonly cause: unknown;

  constructor(
    message: string,
    cause: unknown = null,
    requestId: string | null = null,
  ) {
    super(message, "network_error", 0, requestId);
    this.name = "NetworkError";
    this.cause = cause;
  }
}
