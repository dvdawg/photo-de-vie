/**
 * Turns a dropped original into a library-ready photo: saves it to
 * `originals/`, writes the two derivatives `processed/` needs, and reads back
 * the intrinsic dimensions.
 *
 * Mirrors `scripts/process-photos.sh` — same `sips` invocations, same sizes,
 * same quality — so photos added either way are indistinguishable.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { ORIGINALS_DIR, PROCESSED_DIR, StudioError } from './paths.mjs';
import { slugFromFilename } from './slugify.mjs';

const LONG_LG = 2400;
const LONG_SM = 800;
const QUALITY = 82;
const ACCEPTED = new Set(['.jpg', '.jpeg', '.png', '.heic', '.tif', '.tiff']);

/**
 * @param {{ filename: string, bytes: Buffer, library: Array<{file: string, title: string}> }} args
 * @returns {{ file: string, title: string, tags: string[], width: number, height: number }}
 */
export function ingestPhoto({ filename, bytes, library }) {
  // The name arrives in a header — never let it escape `originals/`.
  const safeName = basename(String(filename ?? '').trim());
  if (!safeName) throw new StudioError('upload is missing a filename');

  const ext = extname(safeName).toLowerCase();
  if (!ACCEPTED.has(ext)) {
    throw new StudioError(`"${safeName}" is not an image sips can read (${[...ACCEPTED].join(', ')})`);
  }
  if (!bytes?.length) throw new StudioError(`"${safeName}" arrived empty`);

  const name = basename(safeName, extname(safeName));
  const slug = slugFromFilename(safeName);
  if (!slug) throw new StudioError(`"${safeName}" has no characters usable in a slug`);

  const clash = library.find((p) => p.file === slug);
  if (clash) {
    throw new StudioError(
      `"${safeName}" becomes the slug "${slug}", which "${clash.title}" already uses. Rename the file and drop it again.`
    );
  }

  mkdirSync(ORIGINALS_DIR, { recursive: true });
  mkdirSync(PROCESSED_DIR, { recursive: true });

  const originalPath = join(ORIGINALS_DIR, safeName);
  writeFileSync(originalPath, bytes);

  const { width, height } = readDimensions(originalPath);
  resize(originalPath, join(PROCESSED_DIR, `${slug}-lg.jpg`), LONG_LG);
  resize(originalPath, join(PROCESSED_DIR, `${slug}-sm.jpg`), LONG_SM);

  return { file: slug, title: name, tags: [], width, height };
}

function readDimensions(path) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], {
    encoding: 'utf8',
  });
  const width = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const height = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!width || !height) throw new StudioError(`sips could not read the dimensions of ${basename(path)}`);
  return { width, height };
}

function resize(from, to, longEdge) {
  execFileSync(
    'sips',
    ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), '-Z', String(longEdge), from, '--out', to],
    { stdio: 'ignore' }
  );
}
