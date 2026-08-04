/**
 * The drop zone. Files are posted one at a time so a rejection can name the
 * file that caused it and the rest still go through.
 */
import { ingest } from './api';
import { toastError, toastOk } from './toast';
import type { LibraryResponse, PhotoEntry } from './types';

interface Options {
  /** Flushes pending edits first, so the server-side append cannot clobber them. */
  beforeIngest: () => Promise<void>;
  onIngested: (result: LibraryResponse & { entry: PhotoEntry }) => void;
}

export function initDropZone({ beforeIngest, onIngested }: Options): void {
  const zone = document.getElementById('dropzone') as HTMLElement;
  const picker = document.getElementById('picker') as HTMLInputElement;
  const progress = document.getElementById('progress') as HTMLElement;

  // Without this, dropping slightly off-target makes the browser navigate to
  // the file and silently lose the page's unsaved state.
  for (const type of ['dragover', 'drop']) {
    window.addEventListener(type, (event) => event.preventDefault());
  }

  zone.addEventListener('click', () => picker.click());
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      picker.click();
    }
  });

  picker.addEventListener('change', () => {
    void run([...(picker.files ?? [])]);
    picker.value = '';
  });

  for (const type of ['dragenter', 'dragover']) {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.dataset.dragging = '';
    });
  }
  for (const type of ['dragleave', 'dragend']) {
    zone.addEventListener(type, () => delete zone.dataset.dragging);
  }

  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    delete zone.dataset.dragging;
    void run([...(event.dataTransfer?.files ?? [])]);
  });

  async function run(files: File[]): Promise<void> {
    if (!files.length) return;

    try {
      await beforeIngest();
    } catch (error) {
      toastError(error);
      return;
    }

    zone.dataset.busy = '';
    progress.hidden = false;
    let added = 0;

    for (const [i, file] of files.entries()) {
      progress.textContent = `Processing ${i + 1} of ${files.length} — ${file.name}…`;
      try {
        onIngested(await ingest(file));
        added += 1;
      } catch (error) {
        toastError(error);
      }
    }

    progress.hidden = true;
    delete zone.dataset.busy;

    if (added) {
      toastOk(
        `Added ${added} photograph${added === 1 ? '' : 's'}. Upload the new files from processed/ to R2 to make them live.`
      );
    }
  }
}
