/** The Loki payload shape — labels are the contract Grafana queries live on. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLokiPayload } from "../src/lib/logship-payload.ts";

describe("buildLokiPayload", () => {
  it("labels by service and app, one value line", () => {
    const p = buildLokiPayload("billing", "charged", { uid: "u1", usd: 30 }, "info", "1700000000000000000");
    assert.deepEqual(p.streams[0].stream, {
      service_name: "site-billing",
      environment: "production",
      host: "vercel",
      level: "info",
    });
    assert.equal(p.streams[0].values.length, 1);
    assert.equal(p.streams[0].values[0][0], "1700000000000000000");
    assert.deepEqual(JSON.parse(p.streams[0].values[0][1]), { msg: "charged", uid: "u1", usd: "30" });
  });
  it("drops null/undefined fields and truncates runaway values", () => {
    const p = buildLokiPayload("admin", "x", { a: null, b: undefined, c: "y".repeat(999) });
    const line = JSON.parse(p.streams[0].values[0][1]);
    assert.deepEqual(Object.keys(line), ["msg", "c"]);
    assert.equal(line.c.length, 300);
  });
});
