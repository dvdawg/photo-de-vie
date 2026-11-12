/** Cancel pending decodes and fades when a viewer switches to another photo. */
const pending = new WeakMap<HTMLImageElement, () => void>();

function preparePhoto(image: HTMLImageElement, src?: string): void {
  pending.get(image)?.();
  image.dataset.photo = '';
  image.dataset.photoState = 'loading';

  let cancelled = false;
  let revealing = false;
  let animation: Animation | undefined;

  function removeListeners(): void {
    image.removeEventListener('load', onLoad);
    image.removeEventListener('error', onError);
  }

  function onError(): void {
    if (cancelled) return;
    removeListeners();
    // Let the browser show the alt text if a photo could not be fetched.
    image.dataset.photoState = 'error';
  }

  async function reveal(fade: boolean): Promise<void> {
    if (revealing || cancelled) return;
    revealing = true;
    try {
      await image.decode();
    } catch {
      // Some browsers can display an image even if decode() rejects.
    }
    if (cancelled) return;
    if (!image.complete || image.naturalWidth === 0) {
      onError();
      return;
    }
    removeListeners();
    image.dataset.photoState = 'ready';
    if (fade && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Use the plate's own final opacity, including double-exposure strength.
      animation = image.animate(
        [{ opacity: 0 }, { opacity: getComputedStyle(image).opacity }],
        { duration: 550, easing: 'ease-out' },
      );
    }
  }

  function onLoad(): void {
    void reveal(true);
  }

  pending.set(image, () => {
    cancelled = true;
    removeListeners();
    animation?.cancel();
  });
  image.addEventListener('load', onLoad);
  image.addEventListener('error', onError);
  if (src !== undefined) image.src = src;

  // Already-loaded (usually cached) photos appear immediately, without replaying
  // a fade. Attach listeners first so a fast response cannot be missed.
  if (image.complete) {
    if (image.naturalWidth > 0) void reveal(false);
    else onError();
  }
}

export function initPhotoLoading(): void {
  document.querySelectorAll<HTMLImageElement>('img[data-photo][src]').forEach((image) => {
    if (image.getAttribute('src')) preparePhoto(image);
  });
}

export function setPhotoSource(image: HTMLImageElement, src: string): void {
  // Reapplying a treatment or reopening the same photo should not reload it.
  if (image.getAttribute('src') === src) return;
  preparePhoto(image, src);
}

export function clearPhotoSource(image: HTMLImageElement): void {
  pending.get(image)?.();
  pending.delete(image);
  delete image.dataset.photoState;
  image.removeAttribute('src');
}
