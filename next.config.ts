import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root: an unrelated lockfile further up the filesystem
  // otherwise makes Turbopack guess wrong about where the project starts.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
