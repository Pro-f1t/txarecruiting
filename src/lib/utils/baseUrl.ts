import { headers } from "next/headers";

/**
 * Absolute origin of the current deployment, for building links that live
 * outside the browser (QR codes, emails). Prefers an explicit env var, then
 * the incoming request's forwarded host, then localhost.
 */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (env) return env.startsWith("http") ? env.replace(/\/$/, "") : `https://${env}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
