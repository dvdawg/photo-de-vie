/**
 * Dominant hues sampled from each photograph, used by selective-colour mode in
 * the lightbox.
 *
 * The values live in `palettes.json`, which is GENERATED — regenerate the whole
 * set with `node scripts/extract-palettes.mjs`, or re-sample a single photo
 * from the studio at `/studio`. This file only puts a type on it.
 */
import type { HueTarget } from './viewModes';
import paletteData from './palettes.json';

export type PhotoPalette = Pick<HueTarget, 'angle' | 'swatch'>;

export const palettes: Record<string, PhotoPalette[]> = paletteData;
