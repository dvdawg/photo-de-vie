/** Thin wrapper over the dev-server routes in `studio/server/routes.mjs`. */
import type { LibraryResponse, PhotoEntry, R2Status } from './types';

const API = '/__studio/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  return body as T;
}

export function fetchLibrary(): Promise<LibraryResponse> {
  return request('/library');
}

export function saveLibrary(photos: PhotoEntry[]): Promise<LibraryResponse> {
  return request('/library', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos }),
  });
}

export function ingest(file: File): Promise<LibraryResponse & { entry: PhotoEntry }> {
  return request('/ingest', {
    method: 'POST',
    // A header cannot carry raw non-ASCII, and the body is the image itself.
    headers: { 'x-studio-filename': encodeURIComponent(file.name) },
    body: file,
  });
}

export function resamplePalette(file: string): Promise<{ file: string; palette: unknown[] }> {
  return request(`/palette/${encodeURIComponent(file)}`, { method: 'POST' });
}

export function fetchR2Status(refresh = false): Promise<R2Status> {
  return request(`/r2-status${refresh ? '?refresh=1' : ''}`);
}

export function reveal(file?: string): Promise<{ revealed: boolean }> {
  return request('/reveal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file }),
  });
}

export function thumbUrl(file: string): string {
  return `/__studio/thumb/${encodeURIComponent(file)}`;
}
