import { filterFor, hueTargets, viewModes } from '../data/viewModes';
import { createModeMenu } from './modeMenu';
import { readPhotoData } from './photoData';

/** The page loads untreated; no mode is persisted between visits. */
const DEFAULT_MODE = 'none';

/**
 * Drives the gallery-wide view mode from the header picker.
 *
 * Filter modes resolve to a single `--photo-filter` custom property on <html>,
 * which every grid photograph inherits (see `PhotoFilters.astro`). Double
 * exposure instead reveals a second plate per card, so it is handled by the
 * `data-view-mode` attribute plus lazily assigned `src` values.
 */
export function initViewMode(): void {
  const photos = readPhotoData();
  const root = document.documentElement;

  const menu = createModeMenu('gallery', (modeId) => {
    mode = modeId;
    apply();
  });

  const hueRow = menu.section('hue-row');
  const shuffleRow = menu.section('shuffle-row');
  const hueButtons = Array.from(hueRow.querySelectorAll<HTMLButtonElement>('[data-hue]'));
  const shuffleBtn = menu.panel.querySelector<HTMLButtonElement>('[data-shuffle]')!;
  const plates = Array.from(document.querySelectorAll<HTMLImageElement>('[data-blend]'));

  let mode = DEFAULT_MODE;
  let hue = hueTargets[0]!.angle;
  /** Partner photo for each library index. Empty until double exposure is used. */
  let pairing: number[] = [];

  /** Gives every photo a different partner, chosen at random. */
  function pair(): void {
    const n = photos.length;
    if (n < 2) return;
    // A non-zero offset guarantees nothing is ever paired with itself.
    pairing = photos.map((_, i) => (i + 1 + Math.floor(Math.random() * (n - 1))) % n);
    plates.forEach((plate, i) => {
      const partner = photos[pairing[i]!];
      if (partner) plate.src = partner.thumb ?? partner.src;
    });
  }

  function apply(): void {
    const kind = viewModes.find((m) => m.id === mode)?.kind;

    root.dataset.viewMode = mode;
    root.style.setProperty('--photo-filter', filterFor(mode, hue));
    menu.setMode(mode, mode === DEFAULT_MODE);

    for (const b of hueButtons) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.hue) === hue));
    }

    hueRow.hidden = kind !== 'selective';
    shuffleRow.hidden = kind !== 'blend';

    if (kind === 'blend' && pairing.length === 0) pair();
  }

  for (const btn of hueButtons) {
    btn.addEventListener('click', () => {
      hue = Number(btn.dataset.hue);
      apply();
    });
  }

  shuffleBtn.addEventListener('click', pair);

  menu.setOpen(false);
  apply();
}
