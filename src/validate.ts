/**
 * Validate that a domain string is safe for use in URL path segments.
 * Prevents path traversal and URL injection attacks.
 */
export function validateDomain(domain: string): void {
  if (!domain || typeof domain !== "string") {
    throw new TypeError("domain is required and must be a non-empty string");
  }

  // Reject path traversal, query injection, and fragment injection
  if (
    domain.includes("/") ||
    domain.includes("\\") ||
    domain.includes("?") ||
    domain.includes("#") ||
    domain.includes("@") ||
    domain.includes(" ")
  ) {
    throw new TypeError(
      `Invalid domain: ${JSON.stringify(domain)}. Domain must not contain /, \\, ?, #, @, or spaces.`,
    );
  }
}

/**
 * Validate that an ID (string or number) is safe for URL path segments.
 */
export function validateId(id: number | string, name: string): void {
  if (typeof id === "number") {
    if (!Number.isFinite(id)) {
      throw new TypeError(`${name} must be a finite number`);
    }
    return;
  }

  if (!id || typeof id !== "string") {
    throw new TypeError(`${name} is required and must be a non-empty string`);
  }

  if (id.includes("/") || id.includes("\\") || id.includes("?") || id.includes("#")) {
    throw new TypeError(
      `Invalid ${name}: ${JSON.stringify(id)}. Must not contain /, \\, ?, or #.`,
    );
  }
}
