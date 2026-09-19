/**
 * The age gate.
 *
 * Allr does not sell to anyone below contract age, so these are the two ways
 * this code can be wrong and both of them are expensive: let a minor through,
 * or turn away an adult on a technicality. The boundary cases — the eighteenth
 * birthday itself, the day before it, and a 29 February birthday in a year that
 * has no 29 February — are the whole point of the file.
 *
 * Run with `pnpm test:age`. No browser, no bundler, no emulator: Node imports
 * the TypeScript directly.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MINIMUM_AGE,
  isOldEnough,
  latestEligibleBirthDate,
  parseBirthDate,
} from "../src/lib/age.ts";

const at = (iso) => new Date(`${iso}T00:00:00.000Z`);

describe("parseBirthDate", () => {
  it("reads a plain YYYY-MM-DD in UTC", () => {
    const d = parseBirthDate("1990-05-04");
    assert.equal(d.toISOString(), "1990-05-04T00:00:00.000Z");
  });

  it("keeps 29 February in a leap year", () => {
    assert.equal(
      parseBirthDate("2004-02-29").toISOString(),
      "2004-02-29T00:00:00.000Z",
    );
  });

  it("refuses a date that does not exist rather than rolling it forward", () => {
    // `new Date("2005-02-29")` would quietly become 1 March.
    assert.equal(parseBirthDate("2005-02-29"), null);
    assert.equal(parseBirthDate("2005-04-31"), null);
    assert.equal(parseBirthDate("2005-13-01"), null);
    assert.equal(parseBirthDate("2005-00-10"), null);
  });

  it("refuses anything that is not the expected shape", () => {
    for (const bad of ["", "1990-5-4", "04/05/1990", "1990-05-04T00:00:00Z", "yesterday"]) {
      assert.equal(parseBirthDate(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
  });
});

describe("isOldEnough", () => {
  it("accepts somebody on the morning of their eighteenth birthday", () => {
    // The birthday itself counts. Off-by-one here refuses a real adult.
    assert.equal(
      isOldEnough(parseBirthDate("2008-03-15"), at("2026-03-15")),
      true,
    );
  });

  it("refuses them the day before", () => {
    assert.equal(
      isOldEnough(parseBirthDate("2008-03-15"), at("2026-03-14")),
      false,
    );
  });

  it("refuses a child by years, not by days", () => {
    assert.equal(isOldEnough(parseBirthDate("2015-01-01"), at("2026-09-08")), false);
  });

  it("accepts somebody comfortably older", () => {
    assert.equal(isOldEnough(parseBirthDate("1970-01-01"), at("2026-09-08")), true);
  });

  it("gives a 29 February birthday its eighteenth on 1 March in a non-leap year", () => {
    const leapling = parseBirthDate("2008-02-29");
    // 2026 has no 29 February; 1 March is the first day they are 18.
    assert.equal(isOldEnough(leapling, at("2026-02-28")), false);
    assert.equal(isOldEnough(leapling, at("2026-03-01")), true);
  });

  it("uses the same threshold the rest of the app does", () => {
    assert.equal(MINIMUM_AGE, 18);
  });
});

describe("latestEligibleBirthDate", () => {
  it("is exactly MINIMUM_AGE years before today", () => {
    assert.equal(latestEligibleBirthDate(at("2026-09-08")), "2008-09-08");
  });

  it("names a date that is itself old enough — the boundary is inclusive", () => {
    const now = at("2026-09-08");
    const boundary = parseBirthDate(latestEligibleBirthDate(now));
    assert.equal(isOldEnough(boundary, now), true);
  });

  it("names a date whose day-after is not old enough", () => {
    const now = at("2026-09-08");
    const dayAfter = new Date(parseBirthDate(latestEligibleBirthDate(now)));
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    assert.equal(isOldEnough(dayAfter, now), false);
  });
});
