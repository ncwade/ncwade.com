# ncwade.com

Personal website and blog for Nick Wade, built with [Astro](https://astro.build) and deployed as a static site on Vercel.

## Tech Stack

- **Framework:** Astro 7 (`output: "static"`) with `<ClientRouter />` view transitions
- **Language:** TypeScript (strict config) and vanilla CSS
- **Images:** Build-time optimization via Sharp (`astro/assets/services/sharp`)
- **Background Map:** Interactive US CloudFront edge network canvas rendered with `topojson-client` and `us-atlas`
- **Hosting & Telemetry:** `@astrojs/vercel` static adapter with Vercel Web Analytics and `@vercel/speed-insights`

## Project Structure

```text
.
├── astro.config.mjs                # Astro, Sharp image, and Vercel adapter config
├── vercel.json                     # Cache-Control and security headers
├── public/                         # Static assets copied verbatim (e.g. favicon.svg)
└── src/
    ├── assets/                     # Optimized assets (headshot.png)
    ├── components/
    │   └── GlobeBackground.astro   # Persisted canvas wrapper for the US edge map
    ├── content.config.ts           # Blog content collection schema
    ├── content/
    │   └── blog/                   # Markdown blog posts (*.md)
    ├── layouts/
    │   └── BaseLayout.astro        # Shared shell, nav, directional view transitions
    ├── pages/
    │   ├── index.astro             # Home
    │   ├── about.astro             # About
    │   ├── experience.astro        # Work history timeline and details modal
    │   ├── contact.astro           # Contact links
    │   ├── principles.astro        # Personal & engineering principles
    │   └── blog/
    │       ├── index.astro         # Blog archive
    │       └── [...slug].astro     # Individual blog post route
    ├── scripts/
    │   └── globe.ts                # Canvas US map & packet animation (respects reduced motion)
    ├── styles/
    │   ├── global.css              # Design tokens, base typography, view-transition animations
    │   ├── layout.css              # Header, responsive nav, footer
    │   ├── components/             # Component stylesheets
    │   └── pages/                  # Per-page stylesheets
    └── utils/
        └── blog.ts                 # Blog collection queries, draft filtering, UTC date formatting
```

## Development

```sh
npm install       # Install dependencies
npm run dev       # Start local dev server at http://localhost:4321 (includes draft posts)
npm run build     # Build static site to ./dist/ and .vercel/output/static (excludes drafts)
npm run preview   # Preview the production build locally
```

## Updating Content

### Adding a Blog Post

Create a `.md` file in `src/content/blog/` with frontmatter matching the schema in `src/content.config.ts`:

```yaml
---
title: Post Title
description: Short summary for the index card and meta description.
pubDate: 2026-11-25
# updatedDate: 2026-11-26  # optional
# draft: true              # optional (defaults to false)
tags:
  - infrastructure
  - systems
---
```

- Posts with `draft: true` appear on `/blog` (with a `Draft` badge) and generate routes during `npm run dev`, but are excluded from `npm run build` so they are never published to production.
- Dates are formatted in UTC (`formatBlogDate` in `src/utils/blog.ts`) so `YYYY-MM-DD` frontmatter dates stay consistent across timezones.

### Updating Work History

1. Edit the `experience` array in `src/pages/experience.astro` (keeping `current: true` on the active role).
2. Update the current-role intro copy in `src/pages/experience.astro` and `src/pages/index.astro`.

## Deployment

`npm run build` outputs static HTML, CSS, JS, and optimized `.webp` images via `@astrojs/vercel` (`imageService: false`, using Sharp at build time). Immutable caching for `/_astro/*`, `/images/*`, and `/favicon.svg`, along with security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`), is configured in `vercel.json`.
