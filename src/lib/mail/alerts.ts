/**
 * The admin digest, pure: the rows that need a person's look — flagged
 * billing events, builds and ops that gave up — as one list of items.
 * The server half (`alertAdmins`) finds the rows and marks them alerted.
 */

import type { DigestItem } from "./types.ts";

export type FlaggedEvent = {
  id: string;
  eventName?: unknown;
  outcome?: unknown;
  reason?: unknown;
  uid?: unknown;
  paymentId?: unknown;
  subscriptionId?: unknown;
  receivedAt?: unknown;
};

export type FailedQueueEntry = { id: string; email?: unknown; username?: unknown; error?: unknown; updatedAt?: unknown };
export type FailedOp = { id: string; op?: unknown; email?: unknown; username?: unknown; error?: unknown; updatedAt?: unknown };

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const when = (v: unknown): string | null => {
  if (typeof v === "string") return v;
  const d = (v as { toDate?: () => Date } | null)?.toDate?.();
  return d instanceof Date ? d.toISOString() : null;
};

const EVENT_LABELS: Record<string, string> = {
  "applied-by-reconcile": "Webhook missed",
  "webhook-silent": "Webhooks silent",
  rejected: "Webhook refused",
  errors: "Reconcile errors",
  "refund-failed": "Automatic refund FAILED",
  "needs-decision": "Refund needs a decision",
  ignored: "Payment not matched",
};

export function labelForEvent(e: FlaggedEvent): string {
  const outcome = str(e.outcome);
  if (outcome && EVENT_LABELS[outcome]) return EVENT_LABELS[outcome];
  const name = str(e.eventName) ?? "event";
  if (name.startsWith("payment.dispute")) return "Dispute";
  return `Flagged: ${name}`;
}

export function digestItems(
  flags: FlaggedEvent[],
  failedBuilds: FailedQueueEntry[],
  failedOps: FailedOp[],
): DigestItem[] {
  const items: DigestItem[] = [];
  for (const e of flags) {
    items.push({
      at: when(e.receivedAt),
      what: labelForEvent(e),
      who: str(e.uid) ?? str(e.paymentId) ?? str(e.subscriptionId),
      detail: (str(e.reason) ?? str(e.eventName) ?? e.id).slice(0, 400),
    });
  }
  for (const q of failedBuilds) {
    items.push({
      at: when(q.updatedAt),
      what: "Provisioning failed",
      who: str(q.email) ?? str(q.username) ?? q.id,
      detail: `${str(q.username) ?? "workspace"} — ${str(q.error) ?? "no error recorded"}. Retry from the admin panel.`.slice(0, 400),
    });
  }
  for (const o of failedOps) {
    items.push({
      at: when(o.updatedAt),
      what: `Op failed: ${str(o.op) ?? o.id}`,
      who: str(o.username) ?? str(o.email) ?? o.id,
      detail: (str(o.error) ?? "no error recorded").slice(0, 400),
    });
  }
  return items.sort((a, b) => Date.parse(b.at ?? "") - Date.parse(a.at ?? "") || a.what.localeCompare(b.what));
}
