import path from "node:path"
import type { NextConfig } from "next"

const dev = process.env.NODE_ENV !== "production"

/**
 * Anciennes URL du site Webador → nouvelles routes (301). Les rubriques
 * dont l'adresse ne change pas (/actualites, /agenda, /art-culture…) sont
 * conservées telles quelles et n'ont pas besoin de redirection.
 */
const redirections: [string, string][] = [
  ["/nos-emissions", "/emissions"],
  ["/podcast-replay", "/podcasts"],
  ["/a-propos-de-nous", "/a-propos"],
  ["/preventions-sensibilisation", "/prevention"],
  ["/accueil", "/"],
  ["/index.html", "/"],
]

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  // Le flux et les podcasts peuvent être servis par un hébergeur audio externe (Radioking…).
  "media-src 'self' https: blob:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ")

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  // Le dépôt parent (Vesti) a son propre package-lock.json : sans cette
  // ligne, Turbopack le prend pour racine et embarque son proxy.ts.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  images: {
    qualities: [75, 85],
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return redirections.map(([source, destination]) => ({ source, destination, permanent: true }))
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ]
  },
}

export default nextConfig
