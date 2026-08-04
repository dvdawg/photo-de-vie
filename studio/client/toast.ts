/** Transient messages. Errors stay until dismissed; successes fade. */
const HOLD_MS = 4000;

function container(): HTMLElement {
  const el = document.getElementById('toasts');
  if (!el) throw new Error('#toasts is missing from the studio page');
  return el;
}

function show(message: string, kind: 'ok' | 'error'): void {
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.textContent = message;

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.textContent = '×';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.addEventListener('click', () => el.remove());
  el.append(dismiss);

  container().append(el);
  if (kind === 'ok') setTimeout(() => el.remove(), HOLD_MS);
}

export function toastOk(message: string): void {
  show(message, 'ok');
}

export function toastError(error: unknown): void {
  show(error instanceof Error ? error.message : String(error), 'error');
}
