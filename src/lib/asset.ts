/**
 * Prefix a public-asset path with the site basePath (e.g. `/allr.github.io`
 * on GitHub project Pages). Empty locally / on root deploys.
 */
export function asset(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
