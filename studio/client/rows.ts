/** Builds one row per library entry from the `<template>`, and wires its fields. */
import { resamplePalette, thumbUrl } from './api';
import * as store from './state';
import { bindTagEditor } from './tags';
import { toastError, toastOk } from './toast';
import type { PhotoEntry, R2Status } from './types';

function q<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`the row template is missing ${selector}`);
  return el;
}

export function renderRows(): void {
  const host = document.getElementById('rows') as HTMLElement;
  host.replaceChildren(...store.photos().map(buildRow));
  updateEmptyState();
}

function updateEmptyState(): void {
  (document.getElementById('empty') as HTMLElement).hidden = store.photos().length > 0;
  (document.getElementById('count') as HTMLElement).textContent = String(store.photos().length);
}

function buildRow(entry: PhotoEntry): HTMLElement {
  const template = document.getElementById('row-template') as HTMLTemplateElement;
  const row = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
  row.dataset.file = entry.file;

  const thumb = q<HTMLImageElement>(row, '[data-thumb]');
  thumb.src = thumbUrl(entry.file);
  thumb.addEventListener('error', () => {
    thumb.removeAttribute('src');
    thumb.title = `no ${entry.file}-sm.jpg in processed/`;
  });

  q(row, '[data-slug]').textContent = entry.file;
  q(row, '[data-dims]').textContent = `${entry.width}×${entry.height}`;

  const title = q<HTMLInputElement>(row, '[data-title]');
  title.value = entry.title;
  title.addEventListener('input', () => store.update(entry.file, { title: title.value }));

  const location = q<HTMLInputElement>(row, '[data-location]');
  location.value = entry.location ?? '';
  location.addEventListener('input', () =>
    store.update(entry.file, { location: location.value.trim() || undefined })
  );

  const year = q<HTMLInputElement>(row, '[data-year]');
  year.value = entry.year ? String(entry.year) : '';
  year.addEventListener('input', () => {
    const raw = year.value.trim();
    store.update(entry.file, { year: raw ? Number(raw) : undefined });
  });

  bindTagEditor(row, entry);
  bindResample(row, entry);
  bindRemove(row, entry);

  return row;
}

function bindResample(row: HTMLElement, entry: PhotoEntry): void {
  const button = q<HTMLButtonElement>(row, '[data-resample]');
  const label = button.textContent;

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'sampling…';
    try {
      const { palette } = await resamplePalette(entry.file);
      toastOk(`${entry.title}: ${palette.length} swatches written to palettes.json`);
    } catch (error) {
      toastError(error);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

function bindRemove(row: HTMLElement, entry: PhotoEntry): void {
  q(row, '[data-remove]').addEventListener('click', () => {
    const ok = confirm(
      `Remove "${entry.title}" from the library?\n\nIts files in processed/ and on R2 are left alone — this only unlists it.`
    );
    if (!ok) return;
    store.remove(entry.file);
    row.remove();
    updateEmptyState();
  });
}

/** Paints the per-row badges and the header summary from a bucket check. */
export function applyR2Status(status: R2Status): void {
  const summary = document.getElementById('r2-summary') as HTMLElement;

  if (!status.configured) {
    summary.hidden = false;
    summary.textContent = 'R2_BASE_URL is unset';
    return;
  }

  let missing = 0;

  for (const row of document.querySelectorAll<HTMLElement>('[data-row]')) {
    const presence = status.photos[row.dataset.file ?? ''];
    const badge = q<HTMLElement>(row, '[data-r2]');
    const absent = !presence?.lg || !presence?.sm;

    badge.hidden = !absent;
    if (!absent) {
      delete row.dataset.missing;
      continue;
    }

    missing += 1;
    row.dataset.missing = '';
    badge.textContent = !presence?.lg && !presence?.sm ? 'not on R2' : !presence.lg ? 'missing ‑lg' : 'missing ‑sm';
  }

  summary.hidden = missing === 0;
  summary.textContent = `${missing} not on R2`;
}
