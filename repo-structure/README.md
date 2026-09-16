# Repository structure diagram

Interactive diagram of our key repositories and how they connect, embedded as
`@fig-repo-structure` in [the team manual](../team-manual/team-manual.qmd).

Interaktives Diagramm unserer wichtigsten Repositories und ihrer Verbindungen,
eingebettet als `@fig-repo-structure` im [Teamhandbuch](../team-manual/team-manual.qmd).

| File | What it is |
|---|---|
| `repo-structure.architecture.json` | **The source of truth.** A typed spec: nodes, relationships, layout coordinates, guided views, summary cards. Edit this. |
| `repo-structure.html` | Generated, self-contained viewer (~730 KB, no external dependencies). **Do not hand-edit** — it is overwritten on every render. |

## Regenerating it

The diagram is built with [Archify](https://github.com/tt-a1i/archify), an agent
skill that renders validated diagrams from a JSON spec. It runs straight from
`npx` with no install:

```bash
npx skills use tt-a1i/archify@archify --agent claude-code
```

That unpacks the skill to a temp directory and prints the path. From that
directory, with `<KM>` as the path to this repository:

```bash
# 1. Validate the spec. Must report 9/9 artifact checks, 0 errors, 0 warnings.
node bin/archify.mjs validate architecture \
  <KM>/repo-structure/repo-structure.architecture.json --quality showcase

# 2. Render. `deliver` re-validates, then writes the HTML atomically.
node bin/archify.mjs deliver architecture \
  <KM>/repo-structure/repo-structure.architecture.json \
  <KM>/repo-structure/repo-structure.html --quality showcase

# 3. Re-apply DML branding — see below. This step is NOT optional.
node <KM>/scripts/archify-brand-dml.mjs <KM>/repo-structure/repo-structure.html

# 4. Optional: browser evidence at four desktop sizes. Writes PNGs and a
#    receipt next to the HTML; delete them afterwards, they are build output.
node bin/archify.mjs visual-check <KM>/repo-structure/repo-structure.html
```

### Editing the spec

Node types are `frontend`, `backend`, `database`, `cloud`, `security`,
`messagebus`, `external`; these drive the colours and the legend. Layout is
explicit: `pos` is `[x, y]` in viewBox units, five columns at x = 25 / 295 /
565 / 835 / 1105 and five rows at y = 60 / 160 / 260 / 360 / 460.

Two constraints are easy to trip over, and `validate` will tell you if you do:

- **Width is capped at ~1395 units.** Node sublabels render at 9 px, and the
  readability check requires ≥ 6 px projected onto a 1440 px desktop. A wider
  canvas shrinks them below that and fails.
- **Height is capped at ~575 units.** Above that the published page scrolls
  vertically on a 1600×1000 laptop, which `visual-check` reports as a
  containment failure. The summary cards cost ~160 px of that budget, so keep
  them to one line each.

In short: this diagram is close to the maximum that fits one screen at a
readable size. Adding nodes will likely mean removing others, or splitting it.

## The manual branding override

**Archify has no brand fields in its JSON schema.** `meta.visual_preset` picks
one of four built-in palettes and `brand` attaches per-node product logos, but
neither can express our colours or type. So branding is applied in two layers:

1. **In the spec** (permanent, validated): `meta.visual_preset: "editorial"` —
   the built-in palette closest to ours, a warm paper canvas with green
   strokes. `meta.animation: "trace"` is also set, which makes edges animate
   and is what un-greys the WebM export.

2. **After rendering** (must be re-applied every time):
   [`scripts/archify-brand-dml.mjs`](../scripts/archify-brand-dml.mjs) appends a
   stylesheet that overrides the viewer's CSS custom properties with our tokens
   for both light and dark, adds DM Sans and DM Serif Display, and patches the
   font stack used for SVG/PNG export so exports are not set in JetBrains Mono.
   It is idempotent — running it twice is harmless.

> **`deliver` regenerates the HTML and discards the override.** If the diagram
> ever looks like stock Archify — slate-blue canvas, cyan and violet nodes,
> monospace type — step 3 was skipped. Re-run it.

### Why the colours are not all literal brand tokens

Our palette is green-dominant and the diagram needs seven distinguishable
component types. Mapping tokens literally made `backend`, `frontend`,
`database` and `messagebus` read as four near-identical greens, and the legend
became unscannable.

So `support` (`#2D6A4F`), `transfer-ink` (`#3E7777`) and `integration-ink`
(`#906436`) are used exactly, and two values are **derived** to restore
separation — `database` (`#1F4A57`, a deep teal-blue) and `messagebus`
(`#7F8B33`, brand-olive darkened). Both are marked as derived in the script.
If brand exactness matters more than type separation here, replace them with
literal tokens from [`dml-brand-yml`](https://github.com/iat-dml/dml-brand-yml)
and accept the flatter legend.

**The override is outside Archify's validated path.** Its contrast and
readability checks run at delivery against the stock palette and are not re-run
against ours. If you change these colours, check them by eye in both themes.

The token values are duplicated in the script rather than read from
`dml-brand-yml`, because the artifact has to stay self-contained. If the brand
palette changes, update the script by hand.

## How it is embedded

The team manual embeds it in an `<iframe>` inside a Quarto figure div, so
`@fig-repo-structure` still cross-references normally. Three things make that
work:

- `_quarto.yml` lists `repo-structure/repo-structure.html` under `resources`.
  Quarto does **not** follow `iframe src` when discovering resources, so
  without that entry the file is not copied into the render output.
- The `src` carries `?theme=light` to match the manual's light page. The
  viewer's own Light/Dark button still works. Drop the parameter to follow the
  reader's OS setting instead.
- The `src` also carries `?embed=1`, which strips the viewer chrome.

### `?embed=1` — what it costs and the trap it sets

Embed mode hides the toolbar, page header, guided views, summary cards, node
search, overview map, focus chip, route probe and semantic lens, leaving the
diagram surface alone. Pan, zoom and click-to-trace still work; **Export,
Present mode, the theme toggle and the guided views do not** — the buttons are
gone. The upside is that the diagram then gets the whole frame and renders
noticeably larger, so labels are easier to read inline.

> **Size the iframe with `aspect-ratio`, never a fixed pixel height.** Embed
> mode sets `.container { max-width: none }` and `body { overflow: hidden }`.
> On a wide monitor the SVG grows past a fixed height and the bottom row of
> repositories and the legend are **silently clipped, with no way to scroll to
> them**. The manual uses `aspect-ratio: 2.4` (the diagram's own ratio, viewBox
> 1380×570 plus padding) with `max-width: 1560px`, verified at 1100 px and
> 2400 px viewport widths.

To get the full viewer back, delete `embed=1` from the `src` and give the
iframe a fixed `height` of about `900px` — with the chrome present the viewer
caps its own reading width, so clipping is not a concern in that mode.

> **Publishing:** the website *pulls* a curated list of files from this
> repository via `pull-docs-from-knowledge-management.yml`. `repo-structure.html`
> must be on that list, or the iframe will 404 on the published site even
> though it works locally.

## Exporting

The viewer's **Export** menu offers PNG (download or clipboard), JPEG, WebP, a
dual-theme SVG, and a 6-second WebM. There is **no GIF export**; convert the
WebM:

```bash
ffmpeg -i diagram.webm -vf "fps=15,scale=1200:-1:flags=lanczos,palettegen" palette.png
ffmpeg -i diagram.webm -i palette.png \
  -lavfi "fps=15,scale=1200:-1:flags=lanczos[x];[x][1:v]paletteuse" diagram.gif
```

The two-pass palette matters — a single-pass GIF of a diagram with fine text
bands badly.
