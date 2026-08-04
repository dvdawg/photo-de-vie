/**
 * Catalogue of darkroom-style view modes.
 *
 * Every treatment is achieved with CSS `mix-blend-mode` or an SVG filter, so
 * none of them read image pixels. That matters: the R2 bucket serves images
 * without an `Access-Control-Allow-Origin` header, so a canvas drawing them
 * would be tainted and `getImageData` would throw. Filters and blend modes are
 * immune to that, and they cost no preprocessing.
 *
 * The filter elements themselves live in `components/PhotoFilters.astro`, keyed
 * `pdv-<mode id>` (and `pdv-selective-<hue id>` for the selective-colour set).
 */

export type ModeKind =
  /** The untouched photograph. */
  | 'plain'
  /** A single SVG filter, referenced by mode id. */
  | 'filter'
  /** Composites a second photograph over the first. */
  | 'blend'
  /** An SVG filter picked by hue target rather than by mode id. */
  | 'selective';

export interface ViewMode {
  id: string;
  label: string;
  /** One-line description shown beneath the label in the picker. */
  hint: string;
  kind: ModeKind;
}

export interface HueTarget {
  id: string;
  label: string;
  /** Hue angle, in degrees, that keeps its colour while the rest greys out. */
  angle: number;
  /** Representative colour for the picker swatch. */
  swatch: string;
}

export const viewModes: ViewMode[] = [
  { id: 'none', label: 'Original', hint: 'No treatment', kind: 'plain' },
  {
    id: 'film',
    label: 'Film',
    hint: 'Print curve, halation and grain',
    kind: 'filter',
  },
  { id: 'grain', label: 'Grain', hint: 'Fine emulsion texture only', kind: 'filter' },
  { id: 'cyanotype', label: 'Cyanotype', hint: 'Blue duotone ramp', kind: 'filter' },
  { id: 'trix', label: 'Tri-X', hint: 'Black and white film curve', kind: 'filter' },
  {
    id: 'contour',
    label: 'Contour',
    hint: 'Topographic luminance bands',
    kind: 'filter',
  },
  {
    id: 'infrared',
    label: 'Infrared',
    hint: 'False-colour channel swap',
    kind: 'filter',
  },
  {
    id: 'selective',
    label: 'Selective colour',
    hint: 'Keeps one hue, greys the rest',
    kind: 'selective',
  },
  {
    id: 'double',
    label: 'Double exposure',
    hint: 'Blends each frame with another',
    kind: 'blend',
  },
];

export const hueTargets: HueTarget[] = [
  { id: 'red', label: 'Red', angle: 0, swatch: '#c0392b' },
  { id: 'orange', label: 'Orange', angle: 32, swatch: '#d67613' },
  { id: 'yellow', label: 'Yellow', angle: 55, swatch: '#c8a415' },
  { id: 'green', label: 'Green', angle: 120, swatch: '#3d8b40' },
  { id: 'cyan', label: 'Cyan', angle: 185, swatch: '#1f8a94' },
  { id: 'blue', label: 'Blue', angle: 225, swatch: '#2c5fa8' },
];

/**
 * Hue angles that need a selective-colour filter generated for them: the fixed
 * set offered in the header, plus every hue sampled from an individual photo.
 */
export function selectiveAngles(perPhoto: number[]): number[] {
  const all = new Set<number>(hueTargets.map((h) => h.angle));
  for (const angle of perPhoto) all.add(angle);
  return [...all].sort((a, b) => a - b);
}

/**
 * The `filter` value for a mode, ready to assign to the custom property that
 * displayed photographs read from (`--photo-filter` in the grid, `--lb-filter`
 * in the lightbox). Selective colour is keyed by hue angle so a photo's own
 * sampled hues work exactly like the fixed ones.
 */
export function filterFor(modeId: string, hueAngle: number): string {
  const mode = viewModes.find((m) => m.id === modeId);
  if (!mode || mode.kind === 'plain' || mode.kind === 'blend') return 'none';
  if (mode.kind === 'selective') return `url('#pdv-selective-${hueAngle}')`;
  return `url('#pdv-${mode.id}')`;
}
