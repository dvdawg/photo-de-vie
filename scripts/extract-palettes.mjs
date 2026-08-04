/**
 * Authoring tool — regenerates `src/data/palettes.json` from the local
 * thumbnails in `processed/`. Run it whenever you add photos:
 *
 *   node scripts/extract-palettes.mjs
 *
 * The studio at `/studio` imports `extractPalette` from here to re-sample a
 * single photograph, so the histogram lives in exactly one place.
 *
 * Why this is precomputed rather than done in the browser: the R2 bucket serves
 * images without an `Access-Control-Allow-Origin` header, so any canvas that
 * draws them is tainted and `getImageData` throws. Sampling here instead keeps
 * the site free of both the CORS problem and any runtime cost.
 *
 * Requires `sips` (macOS), same as `process-photos.sh`. It is never run during
 * `astro build` — the generated file is committed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PALETTES_PATH = join(root, 'src/data/palettes.json');
const LIBRARY_PATH = join(root, 'src/data/library.json');

/** Pixels flatter than this carry no usable hue. */
const MIN_SATURATION = 0.1;
const MIN_LIGHTNESS = 0.08;
const MAX_LIGHTNESS = 0.95;
/** Hue histogram resolution, in degrees. */
const BUCKET = 10;
const MAX_SWATCHES = 8;
/** Aim for at least this many choices per photo before giving up. */
const TARGET_SWATCHES = 5;

/**
 * Selection passes, tried in order until one yields `TARGET_SWATCHES`.
 * Each relaxes how far apart peaks must sit and how small a share counts, so
 * vivid photos get well-spread hues while muted ones still offer real choices.
 */
const PASSES = [
  { separation: 25, shareFloor: 0.02 },
  { separation: 18, shareFloor: 0.008 },
  { separation: 12, shareFloor: 0.003 },
  { separation: 10, shareFloor: 0.001 },
];

/** Decodes a 24/32-bit uncompressed BMP into a flat RGB array. */
function decodeBmp(buf) {
  const dataOffset = buf.readUInt32LE(10);
  const width = buf.readInt32LE(18);
  const height = buf.readInt32LE(22);
  const bpp = buf.readUInt16LE(28);
  if (bpp !== 24 && bpp !== 32) throw new Error(`unsupported bpp ${bpp}`);

  const bytesPerPx = bpp / 8;
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
  const rows = Math.abs(height);
  const bottomUp = height > 0;
  const out = [];

  for (let y = 0; y < rows; y++) {
    const srcRow = bottomUp ? rows - 1 - y : y;
    let p = dataOffset + srcRow * rowSize;
    for (let x = 0; x < width; x++, p += bytesPerPx) {
      out.push(buf[p + 2], buf[p + 1], buf[p]); // BMP stores BGR
    }
  }
  return out;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h / 60) % 6];
  return (
    '#' +
    t
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/** Dominant hues of one image, strongest first. */
function paletteOf(rgb) {
  const buckets = new Array(360 / BUCKET).fill(0);
  const sums = buckets.map(() => ({ s: 0, l: 0, n: 0 }));

  for (let i = 0; i < rgb.length; i += 3) {
    const [h, s, l] = rgbToHsl(rgb[i], rgb[i + 1], rgb[i + 2]);
    if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;
    const b = Math.floor(h / BUCKET) % buckets.length;
    // Weight by saturation so a vivid minority beats a washed-out majority.
    buckets[b] += s;
    sums[b].s += s;
    sums[b].l += l;
    sums[b].n += 1;
  }

  // Smooth across neighbours so a hue straddling two buckets is not split.
  const smoothed = buckets.map((_, i) => {
    const prev = buckets[(i - 1 + buckets.length) % buckets.length];
    const next = buckets[(i + 1) % buckets.length];
    return buckets[i] + 0.5 * (prev + next);
  });

  const total = smoothed.reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  const order = smoothed
    .map((weight, i) => ({ weight, i }))
    .sort((a, b) => b.weight - a.weight);

  /** Greedy pick of the strongest peaks, keeping them `separation` degrees apart. */
  function select(separation, shareFloor) {
    const picked = [];
    for (const { weight, i } of order) {
      if (picked.length >= MAX_SWATCHES) break;
      if (weight / total < shareFloor) break;
      // Smoothing lets a bucket be picked on its neighbours' strength alone, so
      // a peak can hold no pixels of its own. Averaging then divides by zero.
      const { s, l, n } = sums[i];
      if (n === 0) continue;
      const angle = i * BUCKET + BUCKET / 2;
      const clash = picked.some((p) => {
        const d = Math.abs(p.angle - angle);
        return Math.min(d, 360 - d) < separation;
      });
      if (clash) continue;
      picked.push({
        angle,
        // Nudge toward a legible swatch without misrepresenting the hue.
        swatch: hslToHex(
          angle,
          Math.min(0.85, Math.max(0.4, s / n)),
          Math.min(0.62, Math.max(0.32, l / n))
        ),
        share: weight / total,
      });
    }
    return picked;
  }

  let best = [];
  for (const { separation, shareFloor } of PASSES) {
    const picked = select(separation, shareFloor);
    if (picked.length > best.length) best = picked;
    if (best.length >= TARGET_SWATCHES) break;
  }
  return best;
}

/**
 * Dominant hues of one processed thumbnail, strongest first, ready to store.
 * `jpgPath` is an absolute path to a `processed/<slug>-sm.jpg`.
 */
export function extractPalette(jpgPath) {
  if (!existsSync(jpgPath)) throw new Error(`no such image: ${jpgPath}`);
  const tmp = mkdtempSync(join(tmpdir(), 'pdv-palette-'));
  try {
    const bmp = join(tmp, 'sample.bmp');
    // Downsample hard first: 160px is plenty for a hue histogram and keeps this
    // to a couple of seconds for the whole library.
    execFileSync('sips', ['-Z', '160', '-s', 'format', 'bmp', jpgPath, '--out', bmp], {
      stdio: 'ignore',
    });
    return paletteOf(decodeBmp(readFileSync(bmp))).map((p) => ({
      angle: Math.round(p.angle),
      swatch: p.swatch,
    }));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** The committed palette map, keyed by photo slug. */
export function readPalettes() {
  if (!existsSync(PALETTES_PATH)) return {};
  return JSON.parse(readFileSync(PALETTES_PATH, 'utf8'));
}

/** Writes the palette map back, in the given key order. */
export function writePalettes(map) {
  writeFileSync(PALETTES_PATH, JSON.stringify(map, null, 2) + '\n');
}

function main() {
  const library = JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'));
  const result = {};

  for (const { file } of library) {
    const palette = extractPalette(join(root, 'processed', `${file}-sm.jpg`));
    result[file] = palette;
    console.log(
      `${file.padEnd(26)} ${
        palette.map((p) => `${String(p.angle).padStart(3)}°`).join(' ') || '(no strong hues)'
      }`
    );
  }

  writePalettes(result);
  console.log(`\nWrote src/data/palettes.json (${library.length} photos)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
