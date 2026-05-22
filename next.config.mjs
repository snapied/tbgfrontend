import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Replace the upstream `fractional-indexing` package globally with a
  // throw-catching wrapper. Excalidraw 0.18 and y-excalidraw both call
  // its functions in dev-mode render paths; a single bad index from
  // legacy storage was crashing the entire canvas via an "invalid
  // order key head: 0" throw. The wrapper salvages the call and
  // returns a fresh "a0" instead, keeping the editor alive while
  // Excalidraw's own syncInvalidIndices re-spreads the indices on the
  // next scene update.
  //
  // Turbopack's `resolveAlias` requires PROJECT-RELATIVE paths starting
  // with `./` — absolute paths get interpreted as server-relative URLs
  // and 404 with "server relative imports are not implemented". The
  // webpack branch uses absolute paths (resolved via __dirname) since
  // webpack accepts either.
  turbopack: {
    resolveAlias: {
      "fractional-indexing": "./lib/safe-fractional-indexing.ts",
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "fractional-indexing": path.resolve(__dirname, "lib/safe-fractional-indexing.ts"),
    }
    return config
  },
}

export default nextConfig
