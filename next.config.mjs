import { URL } from "node:url";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const remotePatterns = [];

if (process.env.R2_PUBLIC_URL) {
  try {
    const url = new URL(process.env.R2_PUBLIC_URL);
    const pathname =
      url.pathname === "/" ? "/**" : `${url.pathname.replace(/\/$/, "")}/**`;
    const hostname = url.hostname.replace(/\.$/, "");

    remotePatterns.push({
      protocol: url.protocol.replace(":", ""),
      hostname,
      pathname
    });
  } catch (error) {
    console.warn("R2_PUBLIC_URL is not a valid URL and was ignored.", error);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  images: {
    remotePatterns
  },
  headers: async () => {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()"
      }
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload"
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        source: "/(.*)\\.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
