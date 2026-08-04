/**
 * Contract between the gallery and the view-mode script, so neither has to
 * import the other's state.
 */

/** Fired when the lightbox shows a photo, or closes. */
export const LIGHTBOX_EVENT = 'pdv:lightbox';

export interface LightboxDetail {
  /** Index into the photo library, or `null` when the viewer closed. */
  index: number | null;
}

const consumed = new WeakSet<Event>();

/**
 * Marks an event as already acted on, so a second listener on the same node can
 * stand down. `stopPropagation` cannot do this — listeners registered on the
 * same element still all run — and relying on registration order is brittle.
 *
 * Used for Escape: an open dropdown consumes it so the lightbox stays put.
 */
export function consume(event: Event): void {
  consumed.add(event);
}

export function wasConsumed(event: Event): boolean {
  return consumed.has(event);
}
