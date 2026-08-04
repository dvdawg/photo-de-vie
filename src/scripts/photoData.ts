/** Shape of each entry in the JSON payload `Gallery.astro` writes to the page. */
export interface PhotoRecord {
  id: string;
  src: string;
  thumb?: string;
  title: string;
  location?: string;
  year?: number;
  tags: string[];
  width: number;
  height: number;
  /** Dominant hues sampled from this image, strongest first. May be empty. */
  palette: { angle: number; swatch: string }[];
}

let cache: PhotoRecord[] | null = null;

/** The photo library, parsed once and shared by every client script. */
export function readPhotoData(): PhotoRecord[] {
  cache ??= JSON.parse(document.getElementById('photo-data')?.textContent ?? '[]');
  return cache!;
}
