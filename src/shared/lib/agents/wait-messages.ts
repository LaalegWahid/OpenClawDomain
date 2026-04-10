const TIMEOUT_MESSAGES = [
  "⏳ Your request is taking a bit longer than expected. Hang tight!",
  "⏳ Still working on it... please hold on a moment.",
  "⏳ This one's taking a little extra time. We're on it!",
  "⏳ Almost there — just a few more seconds.",
  "⏳ Processing your request, thanks for your patience!",
];

const WARMUP_MESSAGES = [
  "🚀 The agent is warming up and will be ready shortly. Please send your message again!",
  "⚡ Just a moment — the agent is starting up. Try again in a few seconds!",
  "🔄 Agent is spinning up, please resend your message shortly.",
  "🌟 Getting things ready for you! Send your message again in a moment.",
  "⏱️ Agent is booting up — it'll be ready in a few seconds. Please try again!",
];

export function randomTimeoutMessage(): string {
  return TIMEOUT_MESSAGES[Math.floor(Math.random() * TIMEOUT_MESSAGES.length)];
}

export function randomWarmupMessage(): string {
  return WARMUP_MESSAGES[Math.floor(Math.random() * WARMUP_MESSAGES.length)];
}
