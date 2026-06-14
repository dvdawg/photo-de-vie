# photo de vie

my photography portfolio — a gallery-style site built with [Astro](https://astro.build).
Responsive masonry grid, tag filtering (any/all), and a full-screen lightbox.

Photos are **not stored in this repo**. Originals stay on your machine; web-sized
derivatives are uploaded to a [Cloudflare R2](https://developers.cloudflare.com/r2/)
bucket and served by URL.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static build to ./dist
npm run preview
```

Until you point the site at R2 (below), it renders with picsum.photos
placeholders so you can work on layout immediately.

## Photo storage (Cloudflare R2)

### One-time setup

1. Create an R2 bucket in the Cloudflare dashboard.
2. Give it a public URL: enable the **r2.dev** subdomain, or connect a custom
   domain (e.g. `images.yourdomain.com`). Custom domain is recommended.
3. Open [`src/data/photos.ts`](src/data/photos.ts) and set `R2_BASE_URL` to that
   base URL (no trailing slash), e.g.
   `const R2_BASE_URL = 'https://images.yourdomain.com';`

### Adding photos

The site expects two sizes per photo, by filename convention:

| File | Size | Used for |
|------|------|----------|
| `<slug>-lg.jpg` | ~2400px long edge | lightbox / full view |
| `<slug>-sm.jpg` | ~800px long edge  | gallery thumbnail |

The included script makes both from your full-res exports (uses macOS's built-in
`sips` — nothing to install):

```bash
mkdir originals                       # drop your full-res exports here
./scripts/process-photos.sh           # reads ./originals, writes ./processed
```

For each original it writes `processed/<slug>-lg.jpg` and `<slug>-sm.jpg`, and
prints a ready-to-paste entry (with correct dimensions) into
`processed/photos-snippet.txt`.

Then:

1. **Upload** everything in `processed/*.jpg` to your R2 bucket (drag-and-drop in
   the dashboard, or `rclone`/`aws s3 cp` against the R2 endpoint).
2. **Register** the photos: copy the entries from `processed/photos-snippet.txt`
   into the `library` array in [`src/data/photos.ts`](src/data/photos.ts), filling
   in each `title`, `location`, `year`, and `tags`.

`originals/` and `processed/` are git-ignored, so no images ever land in the repo.

### Tags

Tags are free-form strings on each photo. The filter dropdown groups them under
the headings defined in `tagCategories` (in `photos.ts`); any tag not listed
there shows up automatically under an **Other** group, and counts update on their
own. Edit `tagCategories` to rename or reorganize the groups.

## Deploy

The build output in `dist/` is fully static — host it anywhere (GitHub Pages,
Cloudflare Pages, Netlify, etc.). Because images are served from R2, the deployed
site stays tiny regardless of how many photos you add.
