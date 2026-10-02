/**
 * The Loki payload, pure. Separate from the shipper so tests exercise the
 * exact shape production sends.
 */

export type LogService = "billing" | "orchestrator" | "admin" | "account";

export function buildLokiPayload(
  service: LogService,
  message: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
  level: "info" | "warn" | "error" = "info",
  atNs: string = `${Date.now()}000000`,
) {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) clean[k] = String(v).slice(0, 300);
  }
  return {
    streams: [
      {
        stream: {
          service_name: `site-${service}`,
          environment: "production",
          host: "vercel",
          level,
        },
        values: [[atNs, JSON.stringify({ msg: message, ...clean })]] as [string, string][],
      },
    ],
  };
}
