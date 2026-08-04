/**
 * Filename → photo slug.
 *
 * Deliberately identical to the `slugify()` in `scripts/process-photos.sh`, so
 * a photo added through the studio lands on the same slug it would have got
 * from the shell script: lowercase, spaces and underscores to dashes, drop
 * anything outside [a-z0-9-], collapse runs of dashes, trim the ends.
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[ _]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Same, but strips a trailing file extension first. */
export function slugFromFilename(filename) {
  return slugify(filename.replace(/\.[^.]+$/, ''));
}
