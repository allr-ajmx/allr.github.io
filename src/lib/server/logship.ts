import "server-only";

import { buildLokiPayload, type LogService } from "@/lib/logship-payload";

/**
 * Platform events → Grafana Cloud Loki, straight from the server routes.
 * Vercel's free plan has no log drains, so the site pushes its own events,
 * fire-and-forget: a logging outage must never cost a request. Unset env =
 * disabled. What is NEVER sent: user content, prompts, AI traffic.
 */

export type { LogService };

export function shipLog(
  service: LogService,
  message: string,
  fields?: Record<string, string | number | boolean | null | undefined>,
  level: "info" | "warn" | "error" = "info",
): void {
  const url = process.env.GRAFANA_LOKI_URL;
  const user = process.env.GRAFANA_LOKI_USER;
  const token = process.env.GRAFANA_LOKI_TOKEN;
  if (!url || !user || !token) return;

  const body = JSON.stringify(buildLokiPayload(service, message, fields, level));
  // Bounded so a Loki outage cannot hold a serverless function open.
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString("base64")}`,
    },
    body,
    signal: AbortSignal.timeout(2_000),
  }).catch((e) => console.error("[logship] drop:", e?.message ?? e));
}
