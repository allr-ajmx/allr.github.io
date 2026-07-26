/**
 * Build social + favicon assets from logo_base.svg.
 * Run: node scripts/generate-og.mjs  (also: pnpm generate-og)
 *
 * Produces:
 *  - public/og.png (1200×630 Open Graph)
 *  - public/apple-touch-icon.png
 *  - public/favicon.ico + PNG sizes (for Google s2/favicons etc.)
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
const paper = { r: 251, g: 248, b: 242, alpha: 255 };

async function markPng(size, bg = paper) {
  const logo = await sharp(logoSvg)
    .resize(Math.round(size * 0.78), Math.round(size * 0.78), {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const base = await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .png()
    .toBuffer();
  const inset = Math.round(size * 0.11);
  return sharp(base)
    .composite([{ input: logo, top: inset, left: inset }])
    .png()
    .toBuffer();
}

function pngToIco(pngBuffers) {
  const count = pngBuffers.length;
  let offset = 6 + count * 16;
  const entries = [];
  for (const png of pngBuffers) {
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const entry = Buffer.alloc(16);
    entry[0] = w >= 256 ? 0 : w;
    entry[1] = h >= 256 ? 0 : h;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

// Rasterize logo mark (transparent) for OG compositing
await sharp(logoSvg)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(logoMark);

// Favicon set — Google s2 requires /favicon.ico (SVG-only sites often return null)
const fav16 = await markPng(16);
const fav32 = await markPng(32);
const fav48 = await markPng(48);
writeFileSync(join(root, "public", "favicon-16x16.png"), fav16);
writeFileSync(join(root, "public", "favicon-32x32.png"), fav32);
writeFileSync(join(root, "public", "favicon.ico"), pngToIco([fav16, fav32, fav48]));
writeFileSync(join(root, "public", "icon-192.png"), await markPng(192));
writeFileSync(join(root, "public", "icon-256.png"), await markPng(256));
writeFileSync(join(root, "public", "icon-512.png"), await markPng(512));
writeFileSync(join(root, "public", "icon.png"), await markPng(256));
console.log("wrote favicon.ico + PNG icon sizes");

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
