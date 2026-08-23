import type { NextConfig } from "next";

/**
 * Build-time guard for the API base URL.
 *
 * src/lib/api.ts falls back to http://localhost:5000/api when
 * NEXT_PUBLIC_API_URL is unset. That fallback is correct for local
 * development and catastrophic in production: the deployed site would call
 * the visitor's own machine, every request would fail, and because the value
 * is inlined at build time the mistake is invisible until someone loads the
 * page. Vercel builds with NODE_ENV=production, so failing here turns a
 * silent outage into a build error.
 */
function resolveApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  const isProductionBuild = process.env.NODE_ENV === "production";

  if (!isProductionBuild) {
    return url ?? "http://localhost:5000/api";
  }

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Set it in the Vercel project's " +
        "environment variables to the Azure API base URL, e.g. " +
        "https://workwyse-api.azurewebsites.net/api"
    );
  }

  if (!url.startsWith("https://")) {
    // A page served over https cannot call an http endpoint: the browser
    // blocks it as mixed content, and a Secure cookie is never sent.
    throw new Error(
      `NEXT_PUBLIC_API_URL must use https in a production build (received "${url}").`
    );
  }

  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    throw new Error(
      `NEXT_PUBLIC_API_URL still points at a local address ("${url}").`
    );
  }

  return url;
}

const apiUrl = resolveApiUrl();
const apiOrigin = (() => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
})();

/**
 * Response headers applied to every route.
 *
 * Vercel serves the frontend, so these are the frontend's own protections —
 * the API sets its own set separately via helmet.
 */
const securityHeaders = [
  // Refuse to be framed, which blocks clickjacking against the auth forms.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs these capabilities.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next injects inline bootstrap scripts; 'unsafe-inline' is required
      // for the app router unless a nonce pipeline is added.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://media.licdn.com",
      "font-src 'self' data:",
      // The API origin is the only place the page is allowed to call.
      `connect-src 'self' ${apiOrigin}`.trim(),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework version.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
