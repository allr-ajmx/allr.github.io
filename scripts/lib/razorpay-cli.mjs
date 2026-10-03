/**
 * Shared bits for the Razorpay command-line scripts: keys from the
 * environment or, if absent, asked for at the terminal (the secret hidden,
 * so it never lands in shell history), and a small authenticated client.
 */
import { createInterface } from "node:readline";

// One reader for every prompt, with a queue: piped input can deliver lines
// before the next prompt is listening, and a second reader on the same stdin
// would miss what the first had buffered.
let rl = null;
let muted = false;
let closed = false;
const lines = [];
const waiting = [];
function reader() {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
    const write = rl._writeToOutput?.bind(rl);
    if (write) rl._writeToOutput = (s) => { if (!muted) write(s); };
    rl.on("line", (line) => {
      const next = waiting.shift();
      if (next) next(line);
      else lines.push(line);
    });
    rl.on("close", () => {
      closed = true;
      while (waiting.length) waiting.shift()("");
    });
  }
  return rl;
}

function ask(question, { hidden = false } = {}) {
  reader();
  process.stdout.write(question);
  muted = hidden;
  return new Promise((resolve) => {
    const done = (answer) => {
      muted = false;
      if (hidden) process.stdout.write("\n");
      resolve(String(answer ?? "").trim());
    };
    if (lines.length) done(lines.shift());
    else if (closed) done("");
    else waiting.push(done);
  });
}

export function closePrompts() {
  rl?.close();
  rl = null;
}

export async function razorpayKeys() {
  let id = process.env.RAZORPAY_KEY_ID?.trim();
  let secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!id) id = await ask("Razorpay Key Id (rzp_test_… or rzp_live_…): ");
  if (!secret) secret = await ask("Razorpay Key Secret (hidden): ", { hidden: true });
  if (!/^rzp_(test|live)_/.test(id) || !secret) {
    console.error("That doesn't look like a Razorpay key pair (the id starts rzp_test_ or rzp_live_).");
    process.exit(1);
  }
  return { id, secret, mode: id.startsWith("rzp_test_") ? "TEST" : "LIVE" };
}

export async function confirm(question) {
  const a = await ask(`${question} [y/N] `);
  return /^y(es)?$/i.test(a);
}

export function client({ id, secret }) {
  const auth = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  return async function rzp(method, path, body) {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = json?.error ?? {};
      throw new Error(`Razorpay ${res.status} ${e.code ?? ""}: ${e.description ?? "no detail"}`);
    }
    return json;
  };
}

/** Node prints a warning when a .mjs script imports the app's .ts modules; it's harmless. */
export function quietTypeWarnings() {
  const emit = process.emitWarning;
  process.emitWarning = (w, ...rest) => {
    const text = typeof w === "string" ? w : w?.message ?? "";
    if (/MODULE_TYPELESS_PACKAGE_JSON|Module type of file/.test(text) || rest.some((r) => r === "MODULE_TYPELESS_PACKAGE_JSON" || r?.code === "MODULE_TYPELESS_PACKAGE_JSON")) return;
    return emit.call(process, w, ...rest);
  };
}
