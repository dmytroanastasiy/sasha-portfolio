# Portfolio v2 — starter scaffold

A minimal, working Astro project with every piece of your old grading
feedback already addressed structurally. Nothing here is final content —
it's a correct skeleton to build your real portfolio on top of, so you
start from the right architecture instead of retrofitting fixes later.

## How to run it

```bash
npm install
npm run dev
```

Then open the local URL it prints. `npm run build` outputs the static
site to `dist/`, same as before.

## What maps to which feedback

| Feedback | Where it's fixed |
|---|---|
| Collections definition not according to latest docs | `src/content.config.ts` uses the Astro 5 Content Layer API (`loader: glob()` / `loader: file()`), not the deprecated `type: 'content'` pattern. Also note the file moved: `src/content.config.ts`, not `src/content/config.ts`. |
| Skills collection should have been a JSON file | `src/content/skills/skills.json` + the `file()` loader in `content.config.ts`. |
| Wrong usage of markdown: there is no content | `src/content/works/*.md` now have real body content below the frontmatter, rendered via `render(entry)` in `works/[slug].astro` — not a `text` field stuffed into frontmatter. |
| No Astro image | `astro:assets`'s `<Image />` is used in `WorkCard.astro` and `WorkLayout.astro`, and collection schemas validate images via the `image()` helper. |
| Only 1 layout file | Two layouts now: `BaseLayout.astro` (shared shell) and `WorkLayout.astro` (wraps BaseLayout, adds case-study-specific structure). |
| No client side library included | React is wired in (`astro.config.mjs`, `package.json`) with one working example island: `Counter.jsx`, hydrated via `client:load` in `index.astro`. Replace it with something real — your old floating-skills animation would be a good candidate to rebuild here. |

Deliberately left out per your instruction: no separate About page.

## Deploying to GitHub Pages

The workflow file is already included at `.github/workflows/deploy.yml`,
using Astro's official `withastro/action`. Once your code is on GitHub,
it deploys automatically on every push to `main`.

1. **Set your `site` (and `base`) in `astro.config.mjs`.**
   - If your repo is named `<your-username>.github.io`, that's your
     personal root site — set `site: 'https://<your-username>.github.io'`
     and delete the `base` line entirely.
   - Otherwise (e.g. repo named `portfolio-v2`), set
     `site: 'https://<your-username>.github.io'` and
     `base: '/portfolio-v2'` (must match the repo name exactly).

2. **Push this project to a new GitHub repo:**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

3. **Turn on Pages via Actions.** On GitHub: repo → Settings → Pages →
   under "Source" choose **GitHub Actions** (not "Deploy from a branch").

4. That's it — the push in step 2 already triggered the workflow. Check
   the **Actions** tab on your repo to watch it build and deploy. Once
   green, your site is live at the URL from step 1.

Every push to `main` after this redeploys automatically — no manual
build/upload step needed.

## Next steps

1. Replace `src/assets/placeholder.svg` with real project images.
2. Add your real works as new `.md` files in `src/content/works/` — one file per project, following the existing pattern.
3. Update `skills.json` with your actual skill list.
4. Update `site` and `base` in `astro.config.mjs` once you know your GitHub Pages repo name.
5. Decide what the React island actually does — right now it's a placeholder button just to prove the wiring works.
