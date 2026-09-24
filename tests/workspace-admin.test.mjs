/**
 * The admin stamp's contract: what gets in, and who gets to say it.
 * Run with `pnpm test:admin`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStamp, tokenMatches } from "../src/lib/admin/stamp.ts";

const TOKEN = "0123456789abcdef0123456789abcdef"; // 32 chars, the minimum

describe("tokenMatches", () => {
  it("accepts the exact bearer token", () => {
    assert.equal(tokenMatches(`Bearer ${TOKEN}`, TOKEN), true);
  });
  it("refuses a wrong, truncated, or differently-cased token", () => {
    assert.equal(tokenMatches(`Bearer ${TOKEN}x`, TOKEN), false);
    assert.equal(tokenMatches(`Bearer ${TOKEN.slice(1)}`, TOKEN), false);
    assert.equal(tokenMatches(`Bearer ${TOKEN.toUpperCase()}`, TOKEN), false);
  });
  it("refuses a missing header, wrong scheme, or empty token", () => {
    assert.equal(tokenMatches(null, TOKEN), false);
    assert.equal(tokenMatches(`Basic ${TOKEN}`, TOKEN), false);
    assert.equal(tokenMatches("Bearer ", TOKEN), false);
  });
  it("refuses to work at all when the configured token is weak or unset", () => {
    assert.equal(tokenMatches("Bearer short", "short"), false);
    assert.equal(tokenMatches(`Bearer ${TOKEN}`, undefined), false);
  });
});

describe("parseStamp", () => {
  const full = {
    email: "Person@Example.com",
    username: "vishal",
    workspaceEmail: "person@example.com",
    address: "https://vishal.allr.work",
  };

  it("accepts a full set and lower-cases the account email", () => {
    const r = parseStamp(full);
    assert.equal(r.ok, true);
    assert.equal(r.stamp.email, "person@example.com");
    assert.equal(r.stamp.username, "vishal");
  });
  it("accepts snake_case aliases the shell script sends", () => {
    const r = parseStamp({
      email: "a@b.c",
      username: "u",
      workspace_email: "a@b.c",
      workspace_address: "https://u.allr.work",
    });
    assert.equal(r.ok, true);
    assert.equal(r.stamp.address, "https://u.allr.work");
  });
  it("accepts a bare email as a clear", () => {
    const r = parseStamp({ email: "a@b.c" });
    assert.equal(r.ok, true);
    assert.deepEqual(
      [r.stamp.username, r.stamp.workspaceEmail, r.stamp.address],
      [null, null, null],
    );
  });
  it("refuses a partial set — two of three fields is a half-provisioned lie", () => {
    assert.equal(parseStamp({ ...full, address: undefined }).ok, false);
  });
  it("refuses http addresses and missing email", () => {
    assert.equal(parseStamp({ ...full, address: "http://x" }).ok, false);
    assert.equal(parseStamp({ username: "u" }).ok, false);
    assert.equal(parseStamp(null).ok, false);
  });
});

import { checkUsernameShape, RESERVED_USERNAMES } from "../src/lib/admin/username.ts";

describe("checkUsernameShape", () => {
  it("accepts and lower-cases a plain name", () => {
    const r = checkUsernameShape("Vishal");
    assert.equal(r.ok, true);
    assert.equal(r.username, "vishal");
  });
  it("refuses digits-first, symbols, empties, and over-long names", () => {
    assert.equal(checkUsernameShape("1abc").ok, false);
    assert.equal(checkUsernameShape("a-b").ok, false);
    assert.equal(checkUsernameShape("").ok, false);
    assert.equal(checkUsernameShape("a".repeat(32)).ok, false);
    assert.equal(checkUsernameShape("a".repeat(31)).ok, true);
  });
  it("refuses every reserved name", () => {
    for (const name of RESERVED_USERNAMES) {
      assert.equal(checkUsernameShape(name).ok, false, name);
    }
  });
});
