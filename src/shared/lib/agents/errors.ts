export const TIMEOUT_WORDS = [
  "Thinking...",
  "Imagining...",
  "Discombobulating...",
  "Pondering...",
  "Cogitating...",
  "Mulling...",
  "Percolating...",
  "Ruminating...",
  "Marinating...",
  "Brewing...",
  "Conjuring...",
  "Untangling...",
];

export function randomTimeoutWord(): string {
  return TIMEOUT_WORDS[Math.floor(Math.random() * TIMEOUT_WORDS.length)];
}

export function getAgentErrorMessage(errMsg: string, err: unknown): string {
  if (errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed")) {
    return "The agent is starting up. Please try again in a few seconds.";
  }
  if (err instanceof Error && err.name === "TimeoutError") {
    return randomTimeoutWord();
  }
  if (errMsg.includes("403") && errMsg.toLowerCase().includes("key limit")) {
    return "The AI provider's API key has reached its usage limit. Please contact the administrator or try again later.";
  }
  if (errMsg.includes("403")) {
    return "The AI provider rejected the request (authorization issue). Please check your API key settings.";
  }
  if (errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
    return "The AI provider is rate-limiting requests. Please wait a moment and try again.";
  }
  if (errMsg.includes("500") || errMsg.includes("502") || errMsg.includes("503")) {
    return "The AI provider is experiencing issues. Please try again in a few minutes.";
  }
  if (errMsg.includes("maximum iterations")) {
    return "The agent's response was too complex to complete. Please try a simpler question.";
  }
  return "Something went wrong while processing your message. Please try again.";
}
