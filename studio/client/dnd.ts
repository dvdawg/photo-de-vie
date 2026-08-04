/**
 * Drag-to-reorder over the row list.
 *
 * Rows are only `draggable` while the pointer is on their handle, so text
 * selection inside the inputs keeps working. The DOM is reordered live and the
 * store is told the new order once the drag ends.
 */
export function initDragReorder(host: HTMLElement, onReorder: (order: string[]) => void): void {
  let dragged: HTMLElement | null = null;

  host.addEventListener('pointerdown', (event) => {
    const handle = (event.target as HTMLElement).closest('[data-handle]');
    handle?.closest('[data-row]')?.setAttribute('draggable', 'true');
  });

  host.addEventListener('dragstart', (event) => {
    const row = (event.target as HTMLElement).closest('[data-row]') as HTMLElement | null;
    if (!row) return;
    dragged = row;
    row.dataset.dragging = '';
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', row.dataset.file ?? '');
  });

  host.addEventListener('dragover', (event) => {
    if (!dragged) return;
    event.preventDefault();
    const before = rowUnder(host, event.clientY);
    if (before === dragged) return;
    if (before) host.insertBefore(dragged, before);
    else host.append(dragged);
  });

  host.addEventListener('dragend', () => {
    if (!dragged) return;
    delete dragged.dataset.dragging;
    dragged.removeAttribute('draggable');
    dragged = null;
    onReorder(
      [...host.querySelectorAll<HTMLElement>('[data-row]')].map((row) => row.dataset.file ?? '')
    );
  });
}

/** The first row whose midpoint sits below the pointer — the insertion point. */
function rowUnder(host: HTMLElement, y: number): HTMLElement | null {
  const rows = [...host.querySelectorAll<HTMLElement>('[data-row]:not([data-dragging])')];
  return (
    rows.find((row) => {
      const box = row.getBoundingClientRect();
      return y < box.top + box.height / 2;
    }) ?? null
  );
}
