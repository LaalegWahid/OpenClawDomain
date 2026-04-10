export type AgentErrorKind = "unreachable" | "timeout" | "unknown";

export function classifyAgentError(err: unknown): AgentErrorKind {
  if (err instanceof Error) {
    if (err.message.includes("EHOSTUNREACH") || err.message.includes("ECONNREFUSED")) {
      return "unreachable";
    }
    if (err.name === "TimeoutError" || err.message.includes("timeout")) {
      return "timeout";
    }
  }
  return "unknown";
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 800,
    retryOn = ["timeout"] as AgentErrorKind[],
  } = {}
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const kind = classifyAgentError(err);

      if (!retryOn.includes(kind) || attempt === maxAttempts) {
        throw err;
      }

      const delay = baseDelayMs * 2 ** (attempt - 1); // 800ms, 1600ms
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr;
}

