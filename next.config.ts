import type { NextConfig } from "next";
import "./src/shared/config/env";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["discord.js", "zlib-sync", "@discordjs/ws"],
};

export default nextConfig;
