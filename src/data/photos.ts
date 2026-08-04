/**
 * Where your images live.
 *
 * Set this to your Cloudflare R2 bucket's public base URL — either the
 * `https://pub-xxxxxxxx.r2.dev` dev domain or a custom domain you've connected.
 * No trailing slash. Leave it empty ('') to fall back to picsum.photos
 * placeholders so the gallery still renders before you've uploaded anything.
 *
 * Images are referenced by convention (see `scripts/process-photos.sh`):
 *   <file>-lg.jpg   →  ~2400px long edge, shown in the lightbox
 *   <file>-sm.jpg   →  ~800px long edge, shown in the gallery grid
 */
import { palettes, type PhotoPalette } from './palettes';
import libraryData from './library.json';

const R2_BASE_URL = 'https://images.dvdkm.cc';

/** What you fill in per photo. URLs are derived from `file`. */
export interface PhotoInput {
  /** Base filename with no size suffix or extension, e.g. 'dawn-ridge'. */
  file: string;
  title: string;
  /** Where / when the shot was taken — shown in the lightbox caption. */
  location?: string;
  year?: number;
  tags: string[];
  /** Intrinsic pixel dimensions of the original (aspect ratio is what matters). */
  width: number;
  height: number;
}

/** A photo with its image URLs resolved. The gallery consumes this shape. */
export interface Photo extends PhotoInput {
  /** Stable id, used for deep-linking. */
  id: string;
  /** Lightbox / full-view image. */
  src: string;
  /** Gallery thumbnail. */
  thumb: string;
  /**
   * Dominant hues sampled from the image, strongest first. Drives the
   * selective-colour swatches in the lightbox. Regenerate with
   * `node scripts/extract-palettes.mjs`.
   */
  palette: PhotoPalette[];
}

function imageUrl(file: string, role: 'lg' | 'sm', w: number, h: number): string {
  if (!R2_BASE_URL) {
    // Demo fallback so the gallery renders before R2 is configured.
    const long = role === 'lg' ? 1600 : 800;
    const short = Math.round((long * Math.min(w, h)) / Math.max(w, h));
    const [pw, ph] = w >= h ? [long, short] : [short, long];
    return `https://picsum.photos/seed/${file}/${pw}/${ph}`;
  }
  return `${R2_BASE_URL}/${file}-${role}.jpg`;
}

/**
 * Your photo library, kept in `library.json` so the dev-only studio at
 * `/studio` (see `studio/`) can rewrite it without touching this file. Edit it
 * there, or by hand — the shape is exactly `PhotoInput`.
 */
const library: PhotoInput[] = libraryData;

export const photos: Photo[] = library.map((p) => ({
  ...p,
  id: p.file,
  src: imageUrl(p.file, 'lg', p.width, p.height),
  thumb: imageUrl(p.file, 'sm', p.width, p.height),
  palette: palettes[p.file] ?? [],
}));

/** Every tag used across the library, sorted by how often it appears. */
export function allTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    for (const tag of photo.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Groups tags under headings for the filter dropdown. Any tag used by a photo
 * but not listed here lands in an automatic "Other" group, so you can add tags
 * freely and only curate categories when you want to.
 */
export const tagCategories: { name: string; tags: string[] }[] = [
  {
    name: 'scene',
    tags: ['landscape', 'coast', 'water', 'mountains', 'forest', 'desert'],
  },
  { name: 'urban', tags: ['cityscape', 'architecture', 'street'] },
  { name: 'light & mood', tags: ['sunset', 'night', 'clouds', 'fog', 'moody', 'minimal'] },
  { name: 'nature & season', tags: ['winter', 'snow', 'animals', 'flora', 'nature'] },
];

export interface CategorizedTag {
  name: string;
  tags: { tag: string; count: number }[];
}

/** Tag categories with per-tag counts, dropping any tag no photo uses. */
export function categorizedTags(): CategorizedTag[] {
  const counts = new Map<string, number>();
  for (const photo of photos) {
    for (const tag of photo.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const seen = new Set<string>();
  const groups: CategorizedTag[] = tagCategories.map((cat) => ({
    name: cat.name,
    tags: cat.tags
      .filter((tag) => counts.has(tag))
      .map((tag) => {
        seen.add(tag);
        return { tag, count: counts.get(tag)! };
      }),
  }));

  const leftover = [...counts.keys()].filter((tag) => !seen.has(tag)).sort();
  if (leftover.length) {
    groups.push({
      name: 'other',
      tags: leftover.map((tag) => ({ tag, count: counts.get(tag)! })),
    });
  }

  return groups.filter((group) => group.tags.length > 0);
}
