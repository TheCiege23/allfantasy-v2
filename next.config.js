/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        path: false,
      };
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /bullmq[\\/]dist[\\/]esm[\\/]classes[\\/]child-processor\.js$/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },

  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      "/api/**": ["./data/**"],
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sleepercdn.com" },
      { protocol: "https", hostname: "cdn.sleeper.app" },
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "static.www.nfl.com" },
      { protocol: "https", hostname: "cdn.nba.com" },
      { protocol: "https", hostname: "img.mlbstatic.com" },
      { protocol: "https", hostname: "ak-static.cms.nba.com" },
    ],
  },

  // Default dev port is 3000 (next dev). 5000 kept for optional compatibility.
  allowedDevOrigins: [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
  ],

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      // Do not add `/api/:path*` here: Next/Vercel expands it to one header rule per API route
      // (~1600+) and exceeds the 2048 rewrite/redirect/header route cap. API routes get the same
      // headers from `middleware.ts` (`applyApiSecurityHeaders`).
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;