# DML site overview video

A [Remotion](https://remotion.dev) video giving a ~44s overview of the DML
working group website. Content is drawn from the site itself (`index.qmd`,
`services.qmd`, `assets/js/dml-support-tiers.js`, `projects/`, `news/`) and it
uses the site's brand tokens from `light-brand.yml` — DM Serif Display / DM Sans,
the paper background, and the Support / Integration / Transfer stratum colours.

The folder is named `_video` on purpose: Quarto ignores paths beginning with an
underscore, so `node_modules` and the `.tsx` sources never become site inputs.

## Working on it

```bash
cd _video
npm install
npx remotion studio      # preview and edit
```

Studio can write style, keyframe and copy edits back to these files, so scenes
are written with inline styles and inline `interpolate()` calls.

## Rendering

```bash
npx remotion render DmlSiteOverview out/dml-site-overview.mp4
```

## Structure

| Composition | Frames | Content |
| --- | --- | --- |
| `DmlSiteOverview` | 1305 | The whole video — 8 scenes joined by 15-frame crossfades |
| `Scene1-Title` | 150 | Animated strata mark, full title, domain |
| `Scene2-WhereWeSit` | 120 | DML nested inside IAT inside ZALF |
| `Scene3-Mission` | 90 | Mission statement |
| `Scene4-Pillars` | 270 | Support / Integration / Transfer |
| `Scene5-SupportTiers` | 240 | The three-tier staircase from the Services page |
| `Scene6-ExploreSite` | 180 | Navigation, bilingual, open, accessible |
| `Scene7-Projects` | 210 | Four projects plus a news/templates footnote |
| `Scene8-Contact` | 150 | Call to action, site URL, group email |

Scene durations live inline in `src/DmlSiteOverview.tsx` and `src/Root.tsx`. If
you change one, change it in both, and update `durationInFrames` on
`DmlSiteOverview` (sum of scenes minus 7 × 15 transition frames).

`src/StrataMark.tsx` rebuilds the two logo marks from
`assets/logos/dml-strata-deep.svg` and `assets/logos/dml-strata-reversed.svg`
as animated SVG — the strata slide up into the disc.
