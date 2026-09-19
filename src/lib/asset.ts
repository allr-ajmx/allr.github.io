/**
 * A public-asset path.
 *
 * This used to prefix `NEXT_PUBLIC_BASE_PATH`, because the site was a static
 * export served from a GitHub project-Pages subpath. It is served from Vercel
 * at the root now, so there is nothing to prefix — but the function stays, and
 * every caller keeps using it, so that a future subpath deploy is one edit here
 * rather than a hunt through every hand-built asset URL.
 */
export function asset(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}
