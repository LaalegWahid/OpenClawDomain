import type { NextConfig } from "next";
import "./src/shared/config/env";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
