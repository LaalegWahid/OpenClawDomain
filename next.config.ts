import type { NextConfig } from "next";
import "./src/shared/config/env";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
};

export default nextConfig;
