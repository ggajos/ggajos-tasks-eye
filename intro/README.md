# Intro tour

A self-contained, scroll-driven introduction page (GSAP + ScrollTrigger). It
imports nothing from `src/` or `features/`.

- `index.html` – narration copy and page shell.
- `styles.css` – dark-minimal look and the reduced-motion static layout.
- `main.ts` – mock notes and the single scrubbed GSAP timeline.
- `build.mjs` – bundles to `docs/intro/` (or the directory given as argument).

`npm run dev:docs` runs the build last, after Astro cleans `docs/`. To replace
the tour, replace this folder, keeping `build.mjs` and its output location.
Links are relative (`../`) and no external URLs may be used.
