/** Mirrors `PhotoInput` in `src/data/photos.ts` — the shape of `library.json`. */
export interface PhotoEntry {
  file: string;
  title: string;
  location?: string;
  year?: number;
  tags: string[];
  width: number;
  height: number;
}

export interface TagInfo {
  tag: string;
  count: number;
  category: string;
}

export interface R2Presence {
  lg: boolean;
  sm: boolean;
}

export interface R2Status {
  configured: boolean;
  base?: string;
  photos: Record<string, R2Presence>;
}

export interface LibraryResponse {
  photos: PhotoEntry[];
  tags: TagInfo[];
}
