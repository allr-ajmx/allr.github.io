/**
 * Regenerate every favicon from one source of truth.
 *
 * `src/app/icon.svg` is itself generated from the six petal paths in
 * `src/components/ui/AllrMark.tsx`, so the icon is the mark rather than a
 * drawing of it. The version this replaced was hand-traced and sat crooked —
 * its honey ring was centred on (32,32) while the paper disc sat at (36,36),
 * which read as a crescent instead of a ring, and its petals were not
 * consistent mirrors of each other.
 *
 * Run after changing the mark: `pnpm generate-icons`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SVG = path.join(ROOT, "src", "app", "icon.svg");
const PUBLIC = path.join(ROOT, "public");

const svg = readFileSync(SVG);

const PAPER = { r: 0xfd, g: 0xfc, b: 0xf9, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Everything referenced by `icons` in src/app/layout.tsx and by the manifest.
 *
 * `inset` is the share of the canvas left empty around the mark, and it is not
 * decoration:
 *
 * - Browser tabs get none. A 16px favicon needs every pixel, and transparency
 *   is right there because the tab strip is light in one theme and dark in the
 *   other.
 * - iOS composites a transparent home-screen icon onto **black**, so the Apple
 *   icon is opaque paper, with a little room because iOS rounds the corners.
 * - A `maskable` icon is cropped to whatever shape the platform likes — a
 *   circle, a squircle, a teardrop. Only the middle 80% is guaranteed to
 *   survive, so the maskable variant is its own file with real padding rather
 *   than the edge-to-edge one, which would have had its ring shaved off.
 *
 * `logo-mark.png` is deliberately absent: nothing references it, so it is not
 * ours to regenerate.
 */
const PNGS = [
  ["favicon-16x16.png", 16, CLEAR, 0],
  ["favicon-32x32.png", 32, CLEAR, 0],
  ["apple-touch-icon.png", 180, PAPER, 0.08],
  ["icon-192.png", 192, PAPER, 0.06],
  ["icon-512.png", 512, PAPER, 0.06],
  ["icon-512-maskable.png", 512, PAPER, 0.2],
];

async function render(size, background = CLEAR, inset = 0) {
  const mark = Math.round(size * (1 - inset * 2));
  const art = await sharp(svg, { density: 512 })
    .resize(mark, mark, { fit: "contain", background: CLEAR })
    .png()
    .toBuffer();

  if (mark === size && background.alpha === 0) return art;

  const pad = Math.round((size - mark) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: art, top: pad, left: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * An .ico is a tiny container plus, in every format since Vista, ordinary PNGs.
 * sharp cannot write one, but assembling it is a 16-byte header per image —
 * cheaper than another dependency.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

for (const [name, size, background, inset] of PNGS) {
  writeFileSync(path.join(PUBLIC, name), await render(size, background, inset));
  const note = background.alpha === 0 ? "transparent" : `paper, ${inset * 100}% inset`;
  console.log(`  ${name.padEnd(24)} ${size}×${size}  ${note}`);
}

const icoSizes = [16, 32, 48];
const icoImages = [];
for (const size of icoSizes) icoImages.push({ size, data: await render(size) });
writeFileSync(path.join(PUBLIC, "favicon.ico"), ico(icoImages));
console.log(`  favicon.ico              ${icoSizes.join(", ")}  transparent`);
