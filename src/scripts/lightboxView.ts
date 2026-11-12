import { filterFor, hueTargets, viewModes } from '../data/viewModes';
import { LIGHTBOX_EVENT, type LightboxDetail } from './events';
import { createModeMenu } from './modeMenu';
import { readPhotoData, type PhotoRecord } from './photoData';
import { clearPhotoSource, setPhotoSource } from './photoLoading';

const DEFAULT_MODE = 'none';
const DEFAULT_AMOUNT = 65;

/**
 * Per-photograph view mode inside the lightbox.
 *
 * Independent of the gallery: the treatment is written to `--lb-filter` and
 * `data-lb-mode` on the viewer itself, seeded from the gallery mode when it
 * opens and released when it closes, so changing it here never disturbs the
 * grid behind. Selective colour offers the hues sampled from *this* photo, and
 * double exposure lets any photo in the library be the partner.
 */
export function initLightboxView(): void {
  const photos = readPhotoData();
  const lb = document.querySelector<HTMLElement>('[data-lightbox]')!;
  const blend = lb.querySelector<HTMLImageElement>('[data-lb-blend]')!;

  const menu = createModeMenu('lightbox', (modeId) => {
    mode = modeId;
    apply();
  });

  const hueRow = menu.section('hue-row');
  const hueList = menu.panel.querySelector<HTMLElement>('[data-hue-list]')!;
  const blendRow = menu.section('blend-row');
  const partnerList = menu.panel.querySelector<HTMLElement>('[data-partner-list]')!;
  const amount = menu.panel.querySelector<HTMLInputElement>('[data-amount]')!;
  const amountOut = menu.panel.querySelector<HTMLElement>('[data-amount-value]')!;
  const scale = menu.panel.querySelector<HTMLInputElement>('[data-scale]')!;
  const scaleOut = menu.panel.querySelector<HTMLElement>('[data-scale-value]')!;
  const offsetX = menu.panel.querySelector<HTMLInputElement>('[data-offset-x]')!;
  const offsetXOut = menu.panel.querySelector<HTMLElement>('[data-offset-x-value]')!;
  const offsetY = menu.panel.querySelector<HTMLInputElement>('[data-offset-y]')!;
  const offsetYOut = menu.panel.querySelector<HTMLElement>('[data-offset-y-value]')!;
  const fitButtons = Array.from(menu.panel.querySelectorAll<HTMLButtonElement>('[data-fit]'));

  /** Library index on show, or null while the viewer is closed. */
  let index: number | null = null;
  let mode = DEFAULT_MODE;
  let hue = hueTargets[0]!.angle;
  let partner: number | null = null;
  let partnerButtons: HTMLButtonElement[] = [];

  const photoAt = (i: number | null): PhotoRecord | undefined =>
    i === null ? undefined : photos[i];

  /** This photo's own hues, falling back to the fixed set for flat images. */
  function huesFor(photo: PhotoRecord): { angle: number; swatch: string }[] {
    return photo.palette?.length
      ? photo.palette
      : hueTargets.map(({ angle, swatch }) => ({ angle, swatch }));
  }

  function renderHues(): void {
    const photo = photoAt(index);
    if (!photo) return;
    const hues = huesFor(photo);
    // The previous hue may not exist in this photo's palette.
    if (!hues.some((h) => h.angle === hue)) hue = hues[0]!.angle;

    hueList.replaceChildren(
      ...hues.map((h) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'menu-swatch';
        button.style.background = h.swatch;
        button.title = `${h.angle}°`;
        button.setAttribute('aria-label', `Keep the ${h.angle} degree hue`);
        button.setAttribute('aria-pressed', String(h.angle === hue));
        button.addEventListener('click', () => {
          hue = h.angle;
          apply();
        });
        return button;
      })
    );
  }

  /** Thumbnails are built once, on first use, then only their state changes. */
  function ensurePartners(): void {
    if (partnerButtons.length) return;
    partnerButtons = photos.map((photo, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'partner';
      button.dataset.partner = String(i);
      const number = String(i).padStart(2, '0');
      button.title = `Photo ${number}`;
      button.setAttribute('aria-label', `Blend with photo ${number}`);
      button.setAttribute('aria-pressed', 'false');

      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      setPhotoSource(img, photo.thumb ?? photo.src);
      button.appendChild(img);

      button.addEventListener('click', () => {
        partner = i;
        syncBlend();
      });
      return button;
    });
    partnerList.replaceChildren(...partnerButtons);
  }

  /**
   * How far the partner must be scaled up to cover the frame.
   *
   * The partner is laid out with `object-fit: contain`, so it touches the frame
   * on one axis and falls short on the other; the shortfall is exactly the ratio
   * between the two aspect ratios. Scaling by this leaves no letterbox edges —
   * the equivalent of `object-fit: cover`, but adjustable from there.
   */
  function coverScale(base: PhotoRecord, other: PhotoRecord): number {
    const ratio = base.width / base.height / (other.width / other.height);
    return Math.max(ratio, 1 / ratio);
  }

  function setScale(percent: number): void {
    scale.value = String(percent);
    scaleOut.textContent = `${Math.round(percent)}%`;
    lb.style.setProperty('--lb-blend-scale', String(percent / 100));
  }

  function setOffset(axis: 'x' | 'y', percent: number): void {
    const input = axis === 'x' ? offsetX : offsetY;
    const out = axis === 'x' ? offsetXOut : offsetYOut;
    input.value = String(percent);
    out.textContent = String(percent);
    lb.style.setProperty(`--lb-blend-${axis}`, `${percent}%`);
  }

  /** Re-frames the partner for the current pair, discarding manual tweaks. */
  function resetGeometry(): void {
    const base = photoAt(index);
    const other = photoAt(partner);
    setScale(base && other ? Math.round(coverScale(base, other) * 100) : 100);
    setOffset('x', 0);
    setOffset('y', 0);
  }

  function syncBlend(): void {
    if (index === null) return;
    // Pairing a photo with itself just brightens it, so pick a neighbour.
    if (partner === null || partner === index) {
      partner = (index + 1) % photos.length;
    }
    const photo = photoAt(partner);
    if (photo) setPhotoSource(blend, photo.src);

    for (const button of partnerButtons) {
      const i = Number(button.dataset.partner);
      button.setAttribute('aria-pressed', String(i === partner));
      button.disabled = i === index;
    }

    // Each pair has its own geometry, so start from a clean fit.
    resetGeometry();
  }

  function apply(): void {
    const kind = viewModes.find((m) => m.id === mode)?.kind;

    hueRow.hidden = kind !== 'selective';
    blendRow.hidden = kind !== 'blend';

    // Must run before the filter is built: the carried-over hue may not exist
    // in this photograph's palette, and `renderHues` is what re-picks it.
    if (kind === 'selective') renderHues();

    lb.dataset.lbMode = mode;
    lb.style.setProperty('--lb-filter', filterFor(mode, hue));
    menu.setMode(mode, mode === DEFAULT_MODE);

    if (kind === 'blend') {
      ensurePartners();
      syncBlend();
    }
  }

  function setAmount(value: number): void {
    amountOut.textContent = `${value}%`;
    lb.style.setProperty('--lb-blend-amount', String(value / 100));
  }

  amount.addEventListener('input', () => setAmount(Number(amount.value)));
  scale.addEventListener('input', () => setScale(Number(scale.value)));
  offsetX.addEventListener('input', () => setOffset('x', Number(offsetX.value)));
  offsetY.addEventListener('input', () => setOffset('y', Number(offsetY.value)));

  for (const button of fitButtons) {
    button.addEventListener('click', () => {
      const base = photoAt(index);
      const other = photoAt(partner);
      // "Fit whole" is the untouched `contain` layout; "Fill frame" covers it.
      const percent =
        button.dataset.fit === 'fill' && base && other
          ? Math.round(coverScale(base, other) * 100)
          : 100;
      setScale(percent);
      setOffset('x', 0);
      setOffset('y', 0);
    });
  }

  document.addEventListener(LIGHTBOX_EVENT, (e) => {
    const { index: next } = (e as CustomEvent<LightboxDetail>).detail;

    if (next === null) {
      index = null;
      menu.setOpen(false);
      // Release the override so the grid keeps whatever the header selected.
      delete lb.dataset.lbMode;
      lb.style.removeProperty('--lb-filter');
      clearPhotoSource(blend);
      return;
    }

    // Opening: inherit whatever the gallery is currently showing.
    if (index === null) mode = document.documentElement.dataset.viewMode ?? DEFAULT_MODE;
    index = next;
    apply();
  });

  setAmount(DEFAULT_AMOUNT);
}
