/** Wires the studio together. Entry point for `studio/pages/studio.astro`. */
import { fetchLibrary, fetchR2Status, reveal, saveLibrary } from './api';
import { initDragReorder } from './dnd';
import { initDropZone } from './drop';
import { applyR2Status, renderRows } from './rows';
import * as store from './state';
import { renderVocabulary } from './tags';
import { toastError, toastOk } from './toast';

export async function initStudio(): Promise<void> {
  const rows = document.getElementById('rows') as HTMLElement;

  store.subscribe(paintSaveBar);
  initDragReorder(rows, (order) => store.reorder(order));
  wireSaveBar();
  wireHeader();

  initDropZone({
    beforeIngest: flushPendingEdits,
    onIngested: ({ photos, tags }) => {
      store.setBaseline(photos, tags);
      renderVocabulary();
      renderRows();
    },
  });

  window.addEventListener('beforeunload', (event) => {
    if (!store.dirty().total) return;
    event.preventDefault();
    event.returnValue = '';
  });

  try {
    const { photos, tags } = await fetchLibrary();
    store.setBaseline(photos, tags);
    renderVocabulary();
    renderRows();
  } catch (error) {
    toastError(error);
    return;
  }

  void checkR2(false);
}

/** Writes anything pending, so an ingest cannot race the on-disk library. */
async function flushPendingEdits(): Promise<void> {
  if (!store.dirty().total) return;
  const { photos, tags } = await saveLibrary(store.photos());
  store.setBaseline(photos, tags);
  renderVocabulary();
  renderRows();
}

function wireSaveBar(): void {
  const save = document.getElementById('save') as HTMLButtonElement;
  const revert = document.getElementById('revert') as HTMLButtonElement;

  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const { photos, tags } = await saveLibrary(store.photos());
      store.setBaseline(photos, tags);
      renderVocabulary();
      renderRows();
      void checkR2(false);
      toastOk('Written to src/data/library.json — review the diff and commit when ready.');
    } catch (error) {
      toastError(error);
    } finally {
      save.disabled = false;
    }
  });

  revert.addEventListener('click', () => {
    if (!confirm('Discard every unsaved change?')) return;
    store.revert();
    renderRows();
  });

  paintSaveBar();
}

function wireHeader(): void {
  document.getElementById('recheck')?.addEventListener('click', () => void checkR2(true));
  document.getElementById('reveal')?.addEventListener('click', async () => {
    try {
      await reveal();
    } catch (error) {
      toastError(error);
    }
  });
}

async function checkR2(refresh: boolean): Promise<void> {
  const button = document.getElementById('recheck') as HTMLButtonElement;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'checking…';
  try {
    applyR2Status(await fetchR2Status(refresh));
  } catch (error) {
    toastError(error);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

function paintSaveBar(): void {
  const bar = document.getElementById('savebar') as HTMLElement;
  const count = document.getElementById('dirty-count') as HTMLElement;
  const { total, edited, removed, reordered } = store.dirty();

  bar.hidden = total === 0;
  if (!total) return;

  const parts = [];
  if (edited) parts.push(`${edited} edited`);
  if (removed) parts.push(`${removed} removed`);
  if (reordered) parts.push('reordered');
  count.textContent = parts.join(', ');
}
