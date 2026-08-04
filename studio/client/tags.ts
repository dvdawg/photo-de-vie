/**
 * The chip editor inside one row. Enter or comma commits a tag, Backspace on an
 * empty input removes the last one, and anything outside the curated
 * `tagCategories` is marked so it does not silently land in "Other".
 */
import * as store from './state';
import type { PhotoEntry } from './types';

function chipTemplate(): HTMLTemplateElement {
  return document.getElementById('chip-template') as HTMLTemplateElement;
}

function categoryOf(tag: string): string | undefined {
  return store.tagVocabulary().find((t) => t.tag === tag)?.category;
}

export function renderChips(host: HTMLElement, entry: PhotoEntry): void {
  for (const chip of host.querySelectorAll('[data-chip]')) chip.remove();
  const input = host.querySelector('[data-tag-input]')!;

  for (const tag of entry.tags) {
    const chip = chipTemplate().content.firstElementChild!.cloneNode(true) as HTMLElement;
    chip.querySelector('[data-chip-label]')!.textContent = tag;

    const category = categoryOf(tag);
    if (!category || category === 'Other') chip.dataset.uncategorized = '';
    chip.title = category ? `${category} · ${tag}` : `uncategorised · ${tag}`;

    chip.querySelector('[data-chip-remove]')!.addEventListener('click', () => {
      store.update(entry.file, { tags: entry.tags.filter((t) => t !== tag) });
      renderChips(host, entry);
    });

    host.insertBefore(chip, input);
  }
}

export function bindTagEditor(row: HTMLElement, entry: PhotoEntry): void {
  const host = row.querySelector('[data-tags]') as HTMLElement;
  const input = host.querySelector('[data-tag-input]') as HTMLInputElement;

  const commit = () => {
    const tag = input.value.trim().toLowerCase();
    input.value = '';
    if (!tag || entry.tags.includes(tag)) return;
    store.update(entry.file, { tags: [...entry.tags, tag] });
    renderChips(host, entry);
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && input.value === '' && entry.tags.length) {
      store.update(entry.file, { tags: entry.tags.slice(0, -1) });
      renderChips(host, entry);
    }
  });

  input.addEventListener('blur', commit);

  renderChips(host, entry);
}

/** Refreshes the shared `<datalist>` the tag inputs autocomplete against. */
export function renderVocabulary(): void {
  const list = document.getElementById('tag-vocabulary');
  if (!list) return;
  list.replaceChildren(
    ...store.tagVocabulary().map(({ tag, count, category }) => {
      const option = document.createElement('option');
      option.value = tag;
      option.label = `${category} · used ${count}×`;
      return option;
    })
  );
}
