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

import { checkUsernameShape } from "../src/lib/admin/username.ts";
import { checkWorkspaceName, RESERVED_USERNAMES } from "../src/lib/admin/reserved-usernames.ts";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

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
});

describe("reserved workspace names", () => {
  it("refuses every reserved name as taken, and still checks the shape", () => {
    for (const name of RESERVED_USERNAMES) {
      assert.deepEqual(checkWorkspaceName(name), { ok: false, reason: "That name is taken." }, name);
      assert.equal(checkWorkspaceName(name.toUpperCase()).ok, false, name);
    }
    assert.equal(checkWorkspaceName("vishal").ok, true);
    assert.equal(checkWorkspaceName("a-b").ok, false);
  });
  it("holds the company's names, and every entry is a valid username", () => {
    for (const name of ["app", "auth", "authenticate", "admin", "pgadmin", "ceo", "support", "postmaster", "www"]) {
      assert.ok(RESERVED_USERNAMES.has(name), name);
    }
    for (const name of RESERVED_USERNAMES) assert.equal(checkUsernameShape(name).ok, true, name);
  });
  it("matches allr.os's list (when that repo sits beside this one)", (t) => {
    const other = path.resolve(import.meta.dirname, "../../allr.os/provisioner/allr_provisioner/reserved_usernames.txt");
    if (!existsSync(other)) return t.skip("allr.os not checked out beside this repo");
    const theirs = readFileSync(other, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    assert.deepEqual([...RESERVED_USERNAMES].sort(), [...theirs].sort());
  });
  it("is never imported by browser code (it would ship the list)", () => {
    const src = path.resolve(import.meta.dirname, "../src");
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir)) {
        const file = path.join(dir, entry);
        if (statSync(file).isDirectory()) { walk(file); continue; }
        if (!/\.(tsx?|mjs)$/.test(file)) continue;
        const text = readFileSync(file, "utf8");
        if (/^\s*["']use client["']/m.test(text) && /reserved-usernames/.test(text)) offenders.push(path.relative(src, file));
      }
    };
    walk(src);
    assert.deepEqual(offenders, []);
  });
});

describe("admin allowlist parsing", () => {
  // The pure rule mirrors admin-gate: unset means nobody.
  const parse = (raw) =>
    new Set(
      (raw ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    );
  it("unset or empty admits nobody", () => {
    assert.equal(parse(undefined).size, 0);
    assert.equal(parse("").size, 0);
  });
  it("trims, lower-cases, and ignores junk entries", () => {
    const set = parse(" Arunsin997@Gmail.com , jaishukla7768@gmail.com ,notanemail, ");
    assert.equal(set.size, 2);
    assert.equal(set.has("arunsin997@gmail.com"), true);
    assert.equal(set.has("jaishukla7768@gmail.com"), true);
  });
});
