/**
 * Start the Firebase emulator suite for local development.
 *
 * A thin wrapper around `firebase emulators:start`, for two reasons.
 *
 * First, `--import` fails outright when the directory holds no export metadata,
 * which is exactly the state of a fresh clone — so the import is added only
 * once there is something to import.
 *
 * Second, and the reason this file says as much as it does: firebase-tools
 * takes a long time to print its first line — a minute or more on a machine
 * whose disk is busy, because it loads a large bundle before it does anything.
 * A wrapper that stays silent through that is indistinguishable from a wrapper
 * that has swallowed the child's output, so it says what it is running and that
 * the wait is expected.
 *
 * The project id must keep its `demo-` prefix. Under that prefix the emulator
 * runs with no credentials and cannot reach a real Firebase project, which is
 * what guarantees a local test can never write into allr-prod.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SEED = path.join(ROOT, "firebase", "seed");
const PROJECT = "demo-allr";

const bin = path.join(ROOT, "node_modules", ".bin", "firebase");
if (!existsSync(bin)) {
  console.error(
    "\n✗ firebase-tools is not installed.\n  Run `pnpm install` and try again.\n",
  );
  process.exit(1);
}

mkdirSync(SEED, { recursive: true });

const args = ["emulators:start", "--project", PROJECT];

if (existsSync(path.join(SEED, "firebase-export-metadata.json"))) {
  args.push("--import", SEED);
} else {
  console.log("No saved emulator data yet — starting empty.");
}

// Whatever accounts and documents you make while testing are written back here
// on exit, so the next `pnpm emulate` still has your test user.
args.push("--export-on-exit", SEED);

const ports = JSON.parse(
  readFileSync(path.join(ROOT, "firebase.json"), "utf8"),
).emulators;

console.log(`\n  firebase ${args.join(" ")}\n`);
console.log(
  `  Auth :${ports.auth.port}   Firestore :${ports.firestore.port}   UI http://127.0.0.1:${ports.ui.port}`,
);
console.log(
  "  firebase-tools is slow to start — give it a minute before assuming it is stuck.\n",
);

const child = spawn(bin, args, { stdio: "inherit" });

// Without this a failed spawn is completely silent, which looks exactly like
// the child running and printing nothing.
child.on("error", (error) => {
  console.error(`\n✗ Could not start firebase-tools: ${error.message}\n`);
  process.exit(1);
});

// Ctrl+C must reach the emulator, or it exits without writing firebase/seed and
// the test data you just made is gone.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.exit(0);
  if (code !== 0) {
    console.error(
      `\n✗ The emulators exited with code ${code}.` +
        `\n  A port already in use is the usual cause — check firebase.json` +
        ` against \`ss -ltn\`.\n`,
    );
  }
  process.exit(code ?? 0);
});
