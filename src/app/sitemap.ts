import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Every indexable route. `/design` is deliberately absent — it is noindex and
 * URL-only (DESIGN.md §16).
 */
const ROUTES = ["/", "/app", "/download"];

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
