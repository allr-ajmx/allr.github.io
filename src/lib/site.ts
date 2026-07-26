/**
 * Canonical public site URL used for Open Graph, Twitter cards, and sitemap.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL (explicit override)
 * 2. Vercel production / deployment URL
 * 3. GitHub Pages (BASE_PATH deploy)
 * 4. Stable production default
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  // Vercel injects these at build time (no protocol).
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(
    /\/$/,
    "",
  );
  if (vercelProd) return `https://${vercelProd}`;

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  const basePath = (
    process.env.BASE_PATH ||
    process.env.NEXT_PUBLIC_BASE_PATH ||
    ""
  ).replace(/\/$/, "");
  if (basePath) {
    return `https://allar-ajmx.github.io${basePath}`;
  }

  // Prefer the Vercel marketing URL as the canonical production host.
  return "https://allr-all.vercel.app";
}

export const SITE_NAME = "Allr";

export const SITE_TITLE =
  "Allr — the one subscription that replaces all of them";

export const SITE_DESCRIPTION =
  "One AI workspace that makes finished work — from decks, docs, spreadsheets, and videos, all the way to working websites, apps, and games. Describe what you want. Allr makes it, and helps you share it with the world.";

export const SITE_TAGLINE = "the one subscription that replaces all of them";
