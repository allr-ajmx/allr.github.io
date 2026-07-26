/**
 * Build public/og.png (1200×630) with the real Allr mark for Slack/Discord/OG.
 * Run: node scripts/generate-og.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outOg = join(root, "public", "og.png");
const outApple = join(root, "public", "apple-touch-icon.png");
const logoSvg = join(root, "public", "logo_base.svg");
const logoMark = join(root, "public", "logo-mark.png");

const W = 1200;
const H = 630;

// Rasterize logo mark (transparent) for compositing
await sharp(logoSvg)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(logoMark);

const logoB64 = readFileSync(logoMark).toString("base64");

// Full-card SVG — text + brand layout; logo embedded as PNG data URI
const card = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDF8EF"/>
      <stop offset="42%" stop-color="#F7F0E3"/>
      <stop offset="100%" stop-color="#EEF5EF"/>
    </linearGradient>
    <radialGradient id="honey" cx="78%" cy="18%" r="45%">
      <stop offset="0%" stop-color="#E9A83E" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#E9A83E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pine" cx="12%" cy="88%" r="40%">
      <stop offset="0%" stop-color="#2E9E63" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#2E9E63" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#honey)"/>
  <rect width="${W}" height="${H}" fill="url(#pine)"/>

  <!-- brand row: real logo + wordmark -->
  <image href="data:image/png;base64,${logoB64}" x="64" y="56" width="72" height="72"/>
  <text x="152" y="108" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="#223B33">Allr</text>

  <!-- headline -->
  <text x="64" y="280" font-family="Georgia, 'Times New Roman', serif" font-size="54" fill="#223B33">the one subscription that</text>
  <text x="64" y="348" font-family="Georgia, 'Times New Roman', serif" font-size="54" fill="#1E7A49">replaces all of them.</text>

  <!-- subcopy -->
  <text x="64" y="420" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="26" fill="#5C7168">One AI workspace that makes finished work — decks, docs, videos,</text>
  <text x="64" y="456" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="26" fill="#5C7168">websites, apps, and games.</text>

  <!-- chip -->
  <rect x="64" y="520" width="420" height="48" rx="10" fill="#E4F4EA" stroke="#C2E5D0" stroke-width="1.5"/>
  <text x="84" y="552" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="22" font-weight="700" fill="#1E7A49">One workspace · Finished work · Live</text>
</svg>`;

await sharp(Buffer.from(card)).png().toFile(outOg);
console.log("wrote", outOg);

// Apple touch: logo on honey disc
const appleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="32%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#F6C56B"/>
      <stop offset="55%" stop-color="#E9A83E"/>
      <stop offset="100%" stop-color="#B77E1F"/>
    </radialGradient>
  </defs>
  <rect width="180" height="180" rx="40" fill="url(#g)"/>
  <image href="data:image/png;base64,${logoB64}" x="28" y="28" width="124" height="124"/>
</svg>`;

await sharp(Buffer.from(appleSvg)).png().toFile(outApple);
console.log("wrote", outApple);
