#!/usr/bin/env bash
#
# Turn full-res originals into web-sized derivatives for the gallery, using the
# `sips` tool built into macOS (no installs needed).
#
# For each image in the input folder it writes two JPEGs into the output folder:
#   <slug>-lg.jpg   ~2400px on the long edge  (lightbox / full view)
#   <slug>-sm.jpg   ~800px  on the long edge  (gallery thumbnail)
# ...and prints a ready-to-paste entry (with correct dimensions) for the
# `library` array in src/data/photos.ts.
#
# Your originals are never uploaded or committed — only the derivatives in the
# output folder, which you then upload to your R2 bucket.
#
# Usage:
#   ./scripts/process-photos.sh [INPUT_DIR] [OUTPUT_DIR]
# Defaults:
#   INPUT_DIR=./originals   OUTPUT_DIR=./processed

set -euo pipefail

IN_DIR="${1:-originals}"
OUT_DIR="${2:-processed}"
LONG_LG=2400
LONG_SM=800
QUALITY=82

if ! command -v sips >/dev/null 2>&1; then
  echo "error: 'sips' not found (this script targets macOS)." >&2
  exit 1
fi

if [ ! -d "$IN_DIR" ]; then
  echo "error: input folder '$IN_DIR' does not exist." >&2
  echo "Create it and drop your full-res exports inside, then re-run." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# Lowercase, replace spaces/underscores with dashes, strip non-url-safe chars.
# Written for BSD sed (macOS), which lacks \+ and \{n,\} quantifiers.
slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | tr ' _' '--' \
    | sed -e 's/[^a-z0-9-]//g' -e 's/--*/-/g' -e 's/^-//' -e 's/-$//'
}

shopt -s nullglob nocaseglob
files=("$IN_DIR"/*.{jpg,jpeg,png,heic,tif,tiff})
shopt -u nocaseglob

if [ ${#files[@]} -eq 0 ]; then
  echo "No images found in '$IN_DIR' (looked for jpg/jpeg/png/heic/tif)." >&2
  exit 1
fi

echo "Processing ${#files[@]} image(s) from '$IN_DIR' -> '$OUT_DIR'..." >&2
echo >&2

snippet="$OUT_DIR/photos-snippet.txt"
: > "$snippet"

for f in "${files[@]}"; do
  base="$(basename "$f")"
  name="${base%.*}"
  slug="$(slugify "$name")"

  w="$(sips -g pixelWidth  "$f" | awk '/pixelWidth/  {print $2}')"
  h="$(sips -g pixelHeight "$f" | awk '/pixelHeight/ {print $2}')"

  sips -s format jpeg -s formatOptions "$QUALITY" -Z "$LONG_LG" "$f" \
    --out "$OUT_DIR/${slug}-lg.jpg" >/dev/null
  sips -s format jpeg -s formatOptions "$QUALITY" -Z "$LONG_SM" "$f" \
    --out "$OUT_DIR/${slug}-sm.jpg" >/dev/null

  {
    echo "  {"
    echo "    file: '${slug}',"
    echo "    title: '${name}',"
    echo "    tags: [],"
    echo "    width: ${w},"
    echo "    height: ${h},"
    echo "  },"
  } >> "$snippet"

  echo "  ✓ ${slug}  (${w}x${h})" >&2
done

echo >&2
echo "Done." >&2
echo "  • Derivatives written to: $OUT_DIR/*-lg.jpg, $OUT_DIR/*-sm.jpg" >&2
