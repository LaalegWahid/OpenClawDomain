export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initAllDiscordBots } = await import("./shared/lib/discord/manager");
    await initAllDiscordBots();
  }
}
