# DML site tour videos

Two [Remotion](https://remotion.dev) videos that show the DML website itself,
both built for use as full-bleed background video on a reveal.js slide:

- **`DmlSiteTour`** — a 64-second guided tour of the site.
- **`PolicyLabGuideTour`** — 26 seconds on the Policy Lab Guide tool alone, for
  the slide that is about that tool rather than about the site.

It is *footage of the real site*, not a re-drawing of it: `capture/capture.mjs`
serves the built `_site` over HTTP, drives headless Chrome across it, and saves
full-page screenshots. Remotion then supplies all the motion — scrolling,
pushing in, the cursor and its clicks.

The folder is named `_video` on purpose: Quarto ignores paths beginning with an
underscore, so `node_modules` and the `.tsx` sources never become site inputs.

## Working on it

```bash
cd _video
npm install
node capture/capture.mjs   # required first — public/shots/ is gitignored
npx remotion studio
```

## Rendering

```bash
npx remotion render DmlSiteTour out/dml-site-tour.mp4
npx remotion render PolicyLabGuideTour out/policy-lab-guide-tour.mp4
```

## The tour

1920 frames at 30fps — 64 seconds exactly, with hard cuts between scenes. Every
scene draws the same browser window, so a cut reads as navigating rather than as
an edit.

| Composition | Frames | Content |
| --- | --- | --- |
| `DmlSiteTour` | 1920 | The whole tour |
| `Scene1-Home` | 660 | Arrive, hold on the hero, scroll past the concept diagram, settle on the News and Projects columns, click the Policy Lab Guide card |
| `Scene2-PolicyPage` | 300 | The project page, down to the tool embedded in it |
| `Scene3-Resources` | 480 | The resources collection, scrolled through its seven sections |
| `Scene4-Contact` | 480 | Request Support, the form, email and GitHub, then the end card |

The concept diagram and the support-tier staircase are deliberately *not*
featured — they have their own slides in the deck. Scene 1 passes the concept
diagram during a scroll and does not stop on it.

## The Policy Lab Guide video

780 frames — 26 seconds, full frame throughout, no browser chrome. There is no
navigation to imply: the whole point is the tool.

| Composition | Frames | Content |
| --- | --- | --- |
| `PolicyLabGuideTour` | 780 | The tool full frame: phase diagram, then the method library narrowing 14 methods to 2 |
| `PolicyTool` | 780 | The same scene on its own, for iterating in Studio |

The site tour keeps the project page that embeds this tool — its camera drops
onto the live embed and cuts away. The overlap is intentional: the tour shows
that the tool is *there*, this video shows what it *does*. It ends held on the
two methods that survive the filters, so it works as a static end card the way
the tour's does.

## Embedding in the deck

```markdown
## {background-video="assets/dml-site-tour.mp4" background-video-muted="true"}

## {background-video="assets/policy-lab-guide-tour.mp4" background-video-muted="true"}
```

- `background-video-muted="true"` is what makes autoplay work — browsers block
  autoplay with sound.
- Reveal's `background-video-loop` defaults to false, which is what we want: it
  plays once and an ended `<video>` holds its last frame. Both videos end on a
  frame designed to sit there while the presenter keeps talking.
- The deck must be 16:9 (`width: 1600` / `height: 900` in its YAML). Quarto's
  *default* is 1050x700, which is 3:2 and would crop this video left and right.
- Keep the MP4 as a sibling file rather than inlining it; `embed-resources: true`
  would base64 ~6MB into the HTML.

## How the geometry works

Shots are captured at a 1600 CSS-px-wide viewport, so in `PageShot` **`zoom` is
frame pixels per page pixel**: at zoom 1 body copy is 16px on screen, at zoom 2
it is 32px. Scenes build one `Camera` (`zoom`, `focusX`, `focusY`) and share it
between the page and the cursor, so the two cannot drift apart, and the cursor is
aimed using page coordinates read from `public/shots/manifest.json`.

Three constraints bound every camera move — all three were found by rendering
stills, and all three are silent if you get them wrong:

- **`focusY >= viewportHeight / (2 * zoom)`**, or the top of the page lifts clear
  of the viewport and leaves a blank strip. Same in reverse at the bottom:
  `focusY <= pageHeight - viewportHeight / (2 * zoom)`.
- **Zoom caps at ~1.41 for body prose.** The site's content column is 1135 CSS px
  wide (x233-1368), so anything tighter cuts words off the ends of lines. The
  hero is full-bleed and so has more headroom — its h1 spans ~1380px, capping it
  at 1.12 — but the home scene holds it at 1.0 anyway, because a push-in that
  shallow reads as a wobble rather than as intent.
- **Full-bleed scenes cannot go below zoom 1.2**, because a 1600px-wide capture
  scaled under 1920/1600 leaves the frame edges uncovered.

Practical consequence: prose lands at ~22px on screen, which reads as
explanatory text rather than as something to study. Anything the audience must
actually *read* is a heading, a card title, or a caption — those are 36px or
larger.

## Capture notes

- The site sets `respect-user-color-scheme`, and headless Chrome reports **dark**
  by default. The script pins `prefers-color-scheme: light` so shots match the
  brand's light palette and the paper surround the video draws around them.
- `_site` must be served over **HTTP**, not opened as a file — the site loads its
  JS from absolute paths (`/assets/js/...`).
- The Microsoft Forms embed **redirects** `forms.office.com` →
  `forms.cloud.microsoft`, and `networkidle0` returns while it is still showing
  its own spinner. The script waits for real fields inside that cross-origin
  frame. It never fills the form in and never submits it.
- Chrome refuses `fullPage` screenshots taller than ~16384px. Nothing on this
  site comes close, but the script warns and clips rather than failing.
- Run `quarto render` before capturing, or the shots will lag the source.
- `node capture/capture.mjs --inspect` dumps the Policy Lab tool's interactive
  controls and their boxes — how the filter-click sequence was written, and where
  to start if that separate app changes.

If the site changes, re-run the capture and re-check the stills: scene geometry
is written against measured coordinates, so a page growing or shrinking can move
content out of frame. The resources page shrinking by 57px after a text fix was
enough to need a keyframe adjustment.
