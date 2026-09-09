import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Every indexable route. `/design`, `/login` and `/account` are deliberately
 * absent — all three are noindex and URL-only (DESIGN.md §16). The legal pages
 * are the opposite: they have to be findable.
 */
const ROUTES = ["/", "/app", "/download", "/privacy", "/terms"];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: route === "/" ? `${base}/` : `${base}${route}/`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: route === "/" ? 1 : 0.8,
  }));
}
