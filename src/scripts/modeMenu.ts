import { consume } from './events';

/**
 * Open/close and selection plumbing shared by every `ViewModeMenu` instance.
 * Callers supply what a selection *means*; this only tracks which option is
 * pressed and keeps the dropdown well-behaved.
 */
export interface ModeMenu {
  readonly root: HTMLElement;
  readonly panel: HTMLElement;
  readonly toggle: HTMLButtonElement;
  /** Sections slotted in by the caller, looked up by data attribute. */
  section(name: string): HTMLElement;
  /** Reflects the active mode in the option list and the toggle. */
  setMode(modeId: string, isDefault: boolean): void;
  setOpen(open: boolean): void;
}

export function createModeMenu(
  name: string,
  onSelect: (modeId: string) => void
): ModeMenu {
  const root = document.querySelector<HTMLElement>(`[data-mode-menu='${name}']`)!;
  const panel = root.querySelector<HTMLElement>('[data-mode-panel]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-mode-toggle]')!;
  const options = Array.from(panel.querySelectorAll<HTMLButtonElement>('[data-mode]'));

  function setOpen(open: boolean): void {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));

  // Deliberately not stopping propagation: letting the click reach `document`
  // is what closes any *other* open menu.
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !root.contains(e.target as Node)) setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      toggle.focus();
      // Claim the keypress so the lightbox does not also close behind us.
      consume(e);
    }
  });

  for (const option of options) {
    option.addEventListener('click', () => onSelect(option.dataset.mode!));
  }

  return {
    root,
    panel,
    toggle,
    section: (sectionName) =>
      panel.querySelector<HTMLElement>(`[data-${sectionName}]`)!,
    setMode(modeId, isDefault) {
      for (const option of options) {
        option.setAttribute('aria-pressed', String(option.dataset.mode === modeId));
      }
      toggle.classList.toggle('has-active', !isDefault);
    },
    setOpen,
  };
}
