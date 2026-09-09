/**
 * Canonical public site URL used for Open Graph, Twitter cards, and sitemap.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL (explicit override)
 * 2. Vercel production / deployment URL
 * 3. Stable production default
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  // Vercel injects these at build time (no protocol).
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, "");
  if (vercelProd) return `https://${vercelProd}`;

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  return "https://allr-all.vercel.app";
}

export {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_TITLE,
} from "@/lib/brand";
