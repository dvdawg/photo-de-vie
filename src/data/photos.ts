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
 * Your photo library. Add an entry per photo — the easiest way is to run
 * `scripts/process-photos.sh`, which resizes your originals and prints
 * ready-to-paste entries (with correct dimensions) for this array.
 */
const library: PhotoInput[] = [
  {
    file: 'img-1076-3-edited-11',
    title: 'Above the Clouds',
    tags: ['landscape', 'sunset', 'mountains', 'clouds'],
    width: 2048,
    height: 1536,
  },
  {
    file: 'img-1337',
    title: 'Path to the Sea',
    tags: ['landscape', 'sunset', 'coast', 'water'],
    width: 3456,
    height: 5184,
  },
  {
    file: 'img-1555',
    title: 'Point Reyes Beach',
    tags: ['landscape', 'coast', 'water'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1463',
    title: 'Burning Sky',
    tags: ['landscape', 'sunset', 'clouds', 'moody'],
    width: 3456,
    height: 5184,
  },
  {
    file: 'img-2976',
    title: 'Golden Coast',
    tags: ['landscape', 'sunset', 'coast', 'water'],
    width: 4474,
    height: 3356,
  },
  {
    file: 'img-1374-3',
    title: 'Palace of Fine Arts',
    tags: ['architecture', 'cityscape', 'night'],
    width: 3369,
    height: 5053,
  },
  {
    file: 'img-1745',
    title: 'Rocky Surf',
    tags: ['landscape', 'coast', 'water'],
    width: 5074,
    height: 2850,
  },
  {
    file: 'img-1586',
    title: 'Pink Hour Pines',
    tags: ['landscape', 'sunset', 'forest'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1341',
    title: 'Dusk Tide',
    tags: ['landscape', 'sunset', 'coast', 'water', 'moody'],
    width: 3456,
    height: 5184,
  },
  {
    file: 'img-1502',
    title: 'Redwood Road',
    tags: ['landscape', 'forest', 'moody'],
    width: 5184,
    height: 2912,
  },
  {
    file: 'img-1811',
    title: 'Point Cabrillo Light',
    tags: ['landscape', 'coast', 'architecture'],
    width: 5184,
    height: 2912,
  },
  {
    file: 'img-1076-3-edited-6',
    title: 'Lone Pole',
    tags: ['landscape', 'sunset', 'clouds', 'minimal'],
    width: 1536,
    height: 2048,
  },
  {
    file: 'img-2393',
    title: 'Cotton Candy Skyline',
    tags: ['sunset', 'cityscape', 'moody'],
    width: 4608,
    height: 3456,
  },
  {
    file: 'img-1547',
    title: 'Headland Rock',
    tags: ['landscape', 'coast', 'water'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1076-3-edited-3',
    title: 'Fog Rolling In',
    tags: ['landscape', 'mountains', 'fog', 'moody'],
    width: 1474,
    height: 1965,
  },
  {
    file: 'img-1379',
    title: 'The Colonnade',
    tags: ['architecture', 'cityscape', 'night'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-2663',
    title: 'Footprints',
    tags: ['landscape', 'coast', 'water', 'moody'],
    width: 4608,
    height: 3456,
  },
  {
    file: 'img-1445',
    title: 'Valley Lights',
    tags: ['landscape', 'sunset', 'cityscape', 'moody'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1595',
    title: 'Spring Grass',
    tags: ['landscape', 'mountains'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1581',
    title: 'Lenticular Sky',
    tags: ['landscape', 'clouds'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1549',
    title: 'Coastal Ridge',
    tags: ['landscape', 'coast'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-2635',
    title: 'Rolling Green',
    tags: ['landscape', 'sunset', 'minimal'],
    width: 4608,
    height: 3456,
  },
  {
    file: 'img-1419',
    title: 'On the Run',
    tags: ['landscape', 'animals'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-1428',
    title: 'The Long Trail',
    tags: ['landscape', 'minimal'],
    width: 5184,
    height: 3456,
  },
  {
    file: 'img-2441',
    title: 'Dunes',
    tags: ['landscape', 'desert', 'minimal'],
    width: 4608,
    height: 3456,
  },
  {
    file: 'img-2738',
    title: 'Snow Day Downtown',
    tags: ['street', 'snow', 'winter'],
    width: 4608,
    height: 3456,
  },
  {
    file: 'img-3005',
    title: 'Roses in Bloom',
    tags: ['flora', 'nature'],
    width: 4608,
    height: 3318,
  },
];

export const photos: Photo[] = library.map((p) => ({
  ...p,
  id: p.file,
  src: imageUrl(p.file, 'lg', p.width, p.height),
  thumb: imageUrl(p.file, 'sm', p.width, p.height),
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
    name: 'Scene',
    tags: ['landscape', 'coast', 'water', 'mountains', 'forest', 'desert'],
  },
  { name: 'Urban', tags: ['cityscape', 'architecture', 'street'] },
  { name: 'Light & Mood', tags: ['sunset', 'night', 'clouds', 'fog', 'moody', 'minimal'] },
  { name: 'Nature & Season', tags: ['winter', 'snow', 'animals', 'flora', 'nature'] },
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
      name: 'Other',
      tags: leftover.map((tag) => ({ tag, count: counts.get(tag)! })),
    });
  }

  return groups.filter((group) => group.tags.length > 0);
}
