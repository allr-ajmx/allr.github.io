/**
 * An in-memory Razorpay for integration tests: the REST endpoints our server
 * calls, with state the test can inspect and steer. Installed by replacing
 * global fetch for api.razorpay.com only; everything else passes through.
 */

type Json = Record<string, unknown>;

export type FakeSub = {
  id: string; status: string; plan_id: string; customer_id: string; paid_count: number;
  current_start: number | null; current_end: number | null; notes: Record<string, string>;
  start_at?: number | null; addons?: unknown[];
};
export type FakePayment = {
  id: string; status: string; amount: number; currency: string; order_id?: string | null;
  invoice_id?: string | null; amount_refunded: number; email?: string; created_at: number;
  notes?: Record<string, string>;
};

let seq = 0;
const nid = (p: string) => `${p}_${(++seq).toString(36).padStart(10, "0")}`;
const now = () => Math.floor(Date.now() / 1000);

export class FakeRazorpay {
  customers = new Map<string, Json>();
  subscriptions = new Map<string, FakeSub>();
  orders = new Map<string, { id: string; amount: number; currency: string; status: string; notes: Record<string, string> }>();
  payments = new Map<string, FakePayment>();
  refunds = new Map<string, { id: string; payment_id: string; amount: number; currency: string; status: string; notes: Record<string, string>; created_at: number }>();
  invoices: Json[] = [];
  plans = new Map<string, { id: string; period: string; interval: number; item: { name: string; amount: number; currency: string } }>();
  /** The USD→INR rate the fake exchange-rate feed answers with; null: the feed is down. */
  fxRate: number | null = 90;
  calls: { method: string; path: string; body: Json | null }[] = [];
  /** Make the next N calls to paths matching this fail with a 5xx. */
  outage: { match: RegExp; remaining: number } | null = null;
  private original: typeof fetch | null = null;

  install() {
    this.original = globalThis.fetch;
    const original = this.original;
    const handle = (method: string, path: string, q: URLSearchParams, body: Json | null) => {
      this.calls.push({ method, path: path + (q.size ? `?${q}` : ""), body });
      if (this.outage && this.outage.match.test(path) && this.outage.remaining > 0) {
        this.outage.remaining--;
        return json(500, { error: { code: "SERVER_ERROR", description: "simulated outage" } });
      }
      return this.route(method, path, q, body);
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.hostname === "api.frankfurter.dev") {
        // The exchange-rate feed checkout prices India with.
        if (this.fxRate === null) return json(503, { message: "down" });
        return json(200, { amount: 1, base: "USD", date: new Date().toISOString().slice(0, 10), rates: { INR: this.fxRate } });
      }
      if (url.hostname !== "api.razorpay.com") return original(input, init);
      const path = url.pathname.replace(/^\/v1/, "");
      const body = init?.body ? (JSON.parse(String(init.body)) as Json) : null;
      const method = (init?.method ?? "GET").toUpperCase();
      return handle(method, path, url.searchParams, body);
    }) as typeof fetch;
    return this;
  }

  uninstall() {
    if (this.original) globalThis.fetch = this.original;
  }

  /** Test helper: a paid subscription charge happened on Razorpay's side. */
  charge(subId: string, periodDays = 30) {
    const s = this.subscriptions.get(subId)!;
    s.status = "active";
    s.paid_count += 1;
    s.current_start = now();
    s.current_end = now() + periodDays * 86_400;
    const pay = this.addPayment({ amount: 0, currency: "INR", invoice_id: nid("inv"), status: "captured" });
    return pay;
  }

  /**
   * The customer approved the mandate in Checkout. A subscription that starts
   * later becomes "authenticated", and any upfront amount (addon) is charged
   * now; one starting now is charged and active straight away.
   */
  authenticate(subId: string) {
    const s = this.subscriptions.get(subId)!;
    for (const a of (s.addons ?? []) as { item: { amount: number; currency: string } }[]) {
      this.addPayment({ amount: a.item.amount, currency: a.item.currency, invoice_id: nid("inv"), status: "captured" });
    }
    if (s.start_at && s.start_at > now()) s.status = "authenticated";
    else this.charge(subId);
    return s;
  }

  /** Time passes to the subscription's start (a scheduled plan change takes over). */
  start(subId: string) {
    return this.charge(subId);
  }

  addPayment(p: Partial<FakePayment> & { amount: number; currency: string }): FakePayment {
    const payment: FakePayment = {
      id: nid("pay"), status: "captured", amount_refunded: 0, created_at: now(), ...p,
    } as FakePayment;
    this.payments.set(payment.id, payment);
    return payment;
  }

  /** A customer paid an order through Checkout. */
  payOrder(orderId: string, status: "captured" | "authorized" = "captured", email?: string) {
    const o = this.orders.get(orderId)!;
    o.status = "paid";
    return this.addPayment({ amount: o.amount, currency: o.currency, order_id: o.id, status, email });
  }

  /** A refund made outside our code (e.g. the Razorpay dashboard). */
  dashboardRefund(paymentId: string, amount?: number) {
    const p = this.payments.get(paymentId)!;
    const r = { id: nid("rfnd"), payment_id: p.id, amount: amount ?? p.amount, currency: p.currency, status: "processed", notes: {}, created_at: now() };
    this.refunds.set(r.id, r);
    p.amount_refunded += r.amount;
    return r;
  }

  private route(method: string, path: string, q: URLSearchParams, body: Json | null): Response {
    const seg = path.split("/").filter(Boolean);
    const missing = () => json(400, { error: { code: "BAD_REQUEST_ERROR", description: "The id provided does not exist" } });

    if (method === "POST" && path === "/customers") {
      const c = { id: nid("cust"), ...body };
      this.customers.set(c.id as string, c);
      return json(200, c);
    }
    if (method === "POST" && path === "/plans") {
      const item = body!.item as { name: string; amount: number; currency: string };
      const p = { id: nid("plan"), period: String(body!.period), interval: Number(body!.interval), item };
      this.plans.set(p.id, p);
      return json(200, p);
    }
    if (method === "POST" && path === "/subscriptions") {
      const s: FakeSub = {
        id: nid("sub"), status: "created", plan_id: String(body!.plan_id), customer_id: String(body!.customer_id),
        paid_count: 0, current_start: null, current_end: null, notes: (body!.notes ?? {}) as Record<string, string>,
        start_at: (body!.start_at as number) ?? null, addons: (body!.addons as unknown[]) ?? [],
      };
      this.subscriptions.set(s.id, s);
      return json(200, s);
    }
    if (seg[0] === "subscriptions" && seg[1]) {
      const s = this.subscriptions.get(seg[1]);
      if (!s) return missing();
      if (method === "GET" && seg.length === 2) return json(200, s);
      if (method === "POST" && seg[2] === "cancel") {
        if (["cancelled", "completed", "expired"].includes(s.status)) {
          return json(400, { error: { code: "BAD_REQUEST_ERROR", description: "Subscription is not cancellable in cancelled status." } });
        }
        if (!body?.cancel_at_cycle_end) s.status = "cancelled";
        return json(200, s);
      }
    }
    if (method === "GET" && path === "/invoices") {
      const sub = q.get("subscription_id");
      return json(200, { items: this.invoices.filter((i) => i.subscription_id === sub) });
    }
    if (method === "POST" && path === "/orders") {
      const o = { id: nid("order"), amount: Number(body!.amount), currency: String(body!.currency), status: "created", notes: (body!.notes ?? {}) as Record<string, string> };
      this.orders.set(o.id, o);
      return json(200, o);
    }
    if (seg[0] === "orders" && seg[1] && method === "GET") {
      const o = this.orders.get(seg[1]);
      return o ? json(200, o) : missing();
    }
    if (seg[0] === "payments" && seg[1] && seg.length >= 2) {
      const p = this.payments.get(seg[1]);
      if (!p) return missing();
      if (method === "GET" && seg.length === 2) return json(200, p);
      if (method === "POST" && seg[2] === "capture") {
        if (p.status !== "authorized") {
          return json(400, { error: { code: "BAD_REQUEST_ERROR", description: "This payment has already been captured" } });
        }
        p.status = "captured";
        return json(200, p);
      }
      if (method === "POST" && seg[2] === "refund") {
        if (p.amount_refunded >= p.amount) {
          return json(400, { error: { code: "BAD_REQUEST_ERROR", description: "The payment has been fully refunded already" } });
        }
        const r = { id: nid("rfnd"), payment_id: p.id, amount: p.amount - p.amount_refunded, currency: p.currency, status: "processed", notes: (body?.notes ?? {}) as Record<string, string>, created_at: now() };
        this.refunds.set(r.id, r);
        p.amount_refunded = p.amount;
        return json(200, r);
      }
    }
    if (method === "GET" && path === "/payments") {
      const from = Number(q.get("from") ?? 0), to = Number(q.get("to") ?? now() + 1);
      return json(200, { items: [...this.payments.values()].filter((p) => p.created_at >= from && p.created_at <= to) });
    }
    if (method === "GET" && path === "/refunds") {
      const from = Number(q.get("from") ?? 0), to = Number(q.get("to") ?? now() + 1);
      return json(200, { items: [...this.refunds.values()].filter((r) => r.created_at >= from && r.created_at <= to) });
    }
    return json(404, { error: { code: "NOT_FOUND", description: `fake has no route ${method} ${path}` } });
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
