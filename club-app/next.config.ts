import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The parent Vesti repo carries its own package-lock.json. Pin the
  // workspace root so Turbopack doesn't grab the wrong one. `next` invokes
  // this config from the project directory, so cwd is what we want.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
