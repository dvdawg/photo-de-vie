import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const ORIGINALS_DIR = join(ROOT, 'originals');
export const PROCESSED_DIR = join(ROOT, 'processed');
export const LIBRARY_PATH = join(ROOT, 'src/data/library.json');
export const PHOTOS_TS_PATH = join(ROOT, 'src/data/photos.ts');

/** Anything the studio rejects with a message meant for the user's screen. */
export class StudioError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'StudioError';
    this.status = status;
  }
}
