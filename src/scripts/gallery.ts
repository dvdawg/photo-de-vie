import { LIGHTBOX_EVENT, wasConsumed, type LightboxDetail } from './events';
import { readPhotoData } from './photoData';

/**
 * Tag filtering and the lightbox. These share the `visible` list — the lightbox
 * steps through whatever the filter currently shows — so they live together.
 */
export function initGallery(): void {
  const data = readPhotoData();

  const gallery = document.getElementById('gallery')!;
  const cards = Array.from(gallery.querySelectorAll<HTMLElement>('.card'));
  const tagButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tag'));
  const matchButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.match-btn'));
  const clearBtn = document.querySelector<HTMLButtonElement>('[data-clear]')!;
  const emptyEl = document.querySelector<HTMLElement>('[data-empty]')!;
  const tagToggle = document.querySelector<HTMLButtonElement>('[data-tag-toggle]')!;
  const tagMenu = document.querySelector<HTMLElement>('.tag-menu')!;
  const tagPanel = document.querySelector<HTMLElement>('[data-tag-panel]')!;

  const active = new Set<string>();
  let matchMode: 'any' | 'all' = 'any';

  /** Indices (into `data`) of cards currently visible, in DOM order. */
  let visible: number[] = [];

  function matches(tags: string[]): boolean {
    if (active.size === 0) return true;
    const tagSet = new Set(tags);
    if (matchMode === 'all') {
      for (const t of active) if (!tagSet.has(t)) return false;
      return true;
    }
    for (const t of active) if (tagSet.has(t)) return true;
    return false;
  }

  function applyFilter(): void {
    visible = [];
    for (const card of cards) {
      const tags = (card.dataset.tags ?? '').split(' ').filter(Boolean);
      const show = matches(tags);
      card.hidden = !show;
      if (show) visible.push(Number(card.dataset.index));
    }

    emptyEl.hidden = visible.length > 0;
    clearBtn.hidden = active.size === 0;
    tagToggle.classList.toggle('has-active', active.size > 0);
    syncUrl();
  }

  function setPanel(open: boolean): void {
    tagPanel.hidden = !open;
    tagToggle.setAttribute('aria-expanded', String(open));
  }

  tagToggle.addEventListener('click', () => setPanel(tagPanel.hidden));

  // Close the dropdown on outside click or Escape.
  document.addEventListener('click', (e) => {
    if (!tagPanel.hidden && !tagMenu.contains(e.target as Node)) setPanel(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tagPanel.hidden) {
      setPanel(false);
      tagToggle.focus();
    }
  });

  function syncUrl(): void {
    const params = new URLSearchParams();
    if (active.size > 0) params.set('tags', [...active].join(','));
    if (matchMode === 'all') params.set('match', 'all');
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function readUrl(): void {
    const params = new URLSearchParams(location.search);
    const tags = params.get('tags');
    if (tags) {
      for (const t of tags.split(',').map((s) => s.trim()).filter(Boolean)) {
        active.add(t);
      }
    }
    if (params.get('match') === 'all') matchMode = 'all';
  }

  // --- Tag interactions ---
  for (const btn of tagButtons) {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag!;
      if (active.has(tag)) active.delete(tag);
      else active.add(tag);
      btn.setAttribute('aria-pressed', String(active.has(tag)));
      applyFilter();
    });
  }

  for (const btn of matchButtons) {
    btn.addEventListener('click', () => {
      matchMode = btn.dataset.mode as 'any' | 'all';
      for (const b of matchButtons) b.classList.toggle('is-active', b === btn);
      applyFilter();
    });
  }

  clearBtn.addEventListener('click', () => {
    active.clear();
    for (const b of tagButtons) b.setAttribute('aria-pressed', 'false');
    applyFilter();
  });

  // --- Lightbox ---
  const lb = document.querySelector<HTMLElement>('[data-lightbox]')!;
  const lbImg = lb.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const lbTitle = lb.querySelector<HTMLElement>('[data-lb-title]')!;
  const lbSub = lb.querySelector<HTMLElement>('[data-lb-sub]')!;
  const lbCounter = lb.querySelector<HTMLElement>('[data-lb-counter]')!;
  const lbPrev = lb.querySelector<HTMLButtonElement>('[data-lb-prev]')!;
  const lbNext = lb.querySelector<HTMLButtonElement>('[data-lb-next]')!;
  const lbClose = lb.querySelector<HTMLButtonElement>('[data-lb-close]')!;

  /** Position within `visible` of the photo currently shown. */
  let pos = -1;
  let lastFocused: HTMLElement | null = null;

  function announce(index: number | null): void {
    const detail: LightboxDetail = { index };
    document.dispatchEvent(new CustomEvent(LIGHTBOX_EVENT, { detail }));
  }

  function render(): void {
    const index = visible[pos];
    const photo = data[index];
    if (!photo) return;
    lbImg.src = photo.src;
    lbImg.alt = photo.title;
    lbTitle.textContent = photo.title;
    lbCounter.textContent = `${String(pos + 1).padStart(2, '0')} / ${String(
      visible.length
    ).padStart(2, '0')}`;
    const sub = [photo.location, photo.year].filter(Boolean).join(' · ');
    lbSub.textContent = sub;
    lbSub.hidden = !sub;
    lbPrev.disabled = pos <= 0;
    lbNext.disabled = pos >= visible.length - 1;
    announce(index);
  }

  function openAt(index: number): void {
    pos = visible.indexOf(index);
    if (pos === -1) return;
    lastFocused = document.activeElement as HTMLElement;
    lb.hidden = false;
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    render();
    lbClose.focus();
  }

  function close(): void {
    lb.hidden = true;
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus();
    announce(null);
  }

  function step(delta: number): void {
    const next = pos + delta;
    if (next < 0 || next >= visible.length) return;
    pos = next;
    render();
  }

  for (const card of cards) {
    const btn = card.querySelector<HTMLButtonElement>('.card-btn')!;
    btn.addEventListener('click', () => openAt(Number(card.dataset.index)));
  }

  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', () => step(-1));
  lbNext.addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    // An open dropdown owns Escape first, so the viewer does not close
    // underneath it. Both checks are needed because listener order is not
    // guaranteed: whichever handler runs first, one of them catches it.
    if (e.key === 'Escape') {
      const menuOpen =
        wasConsumed(e) || document.querySelector('[data-mode-panel]:not([hidden])');
      if (!menuOpen) close();
    } else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // --- Init ---
  readUrl();
  for (const btn of tagButtons) {
    btn.setAttribute('aria-pressed', String(active.has(btn.dataset.tag!)));
  }
  for (const b of matchButtons) {
    b.classList.toggle('is-active', b.dataset.mode === matchMode);
  }
  setPanel(false);
  applyFilter();
}
