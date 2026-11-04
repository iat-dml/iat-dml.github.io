# IAT Statusseminar 2026 — DML Service Working Group

| | |
|---|---|
| **Event** | IAT Statusseminar 2026 |
| **Presenter** | Benjamin Samuel Black |
| **Date** | 24 September 2026 |

Presentation of the activities of the DML service working group, structured as a walk
through the three strata of the service concept — Support, Transfer, Integration — with
exemplar completed projects for each.

## Running it

Open `index.html` in a browser. No build step, no server, no network: reveal.js and the
brand fonts are vendored under `vendor/`. It works from a USB stick.

The project slides embed live `iframe`s, which do need the network. Each has a screenshot
underneath as a fallback, so a blocked or slow iframe degrades to a still rather than to
blank — see the TODO list below for the ones still to capture.

The live audience quiz used during the talk has since been removed; see
[Live audience quiz (removed)](#live-audience-quiz-removed).

Keys: arrows or space to advance, `S` for speaker view with notes, `F` for fullscreen,
`ESC` for the slide overview, `T` to switch theme.

### Two designs: DML and IAT

The deck comes in two skins over the same slides:

| Version | Open | Look |
|---|---|---|
| DML (default) | `index.html` | DML group branding: paper ground, DM Sans / DM Serif Display, olive accents |
| IAT-ZALF | `iat.html`, or `index.html?theme=iat` | IAT corporate design: white ground, Segoe UI, the IAT green hero gradient, ZALF green accents |

`iat.html` is not a copy — it redirects to `index.html?theme=iat`, keeping any `#/n` slide
hash, so the two can never drift apart. `T` flips between them on the current slide (it
reloads, because the diagram reads its colours and fonts once). PDF export works the same
way: `index.html?theme=iat&print-pdf`.

The IAT title slide follows the [iat Quarto extension](C:/git/templates/iat-revealjs):
white header with the institution and logos, the green hero block, the partner and funder
footer. The DML mark sits in the header beside the ZALF-IAT logo rather than on the green.
Every other slide keeps its layout and only takes the IAT palette and type — the
extension's teal banner across the top of each slide is deliberately not used.

How it works: a snippet at the top of `index.html` sets `data-theme="iat"` on `<html>`, and
`css/theme-iat.css` — every rule scoped to that attribute — overrides the tokens in
`css/brand.css` plus the handful of places that differ. Markup that differs between the
two (the title slide's header and footer, the corner logo) is written out twice with
`theme-dml-only` / `theme-iat-only`. The IAT assets are copies of the extension's, in
`assets/iat/`.

## How it is built

Hand-rolled reveal.js 5.1.0 rather than Quarto, because the concept diagram has to
**shrink, travel and fade across slide boundaries** — it grows from a corner locator to a
half-slide panel and hands off to a fullscreen video. That means it cannot be re-mounted
per slide, so it lives in a persistent `#stage` layer *outside* `.slides` and is driven
imperatively.

```
index.html          slides; the deck is authored here
iat.html            opens index.html in the IAT-ZALF theme
css/brand.css       brand tokens, ported from the dml Quarto extension's _brand.yml
css/theme-iat.css   the IAT-ZALF theme, applied under ?theme=iat
css/deck.css        typography and slide styling, plain-CSS port of its custom.scss
css/stage.css       the persistent diagram layer and its layout states
js/strata-diagram.js  the diagram, refactored from the website's dml-concept-diagram.js
js/director.js      maps slide state onto diagram state
js/handoff.js       grows a project card's still into the next slide's fullscreen video
js/deck.js          Reveal.initialize
backend/            a separate Netlify site: the former quiz's relay functions,
                    its durable answer store and export endpoint -- deployed
                    on its own, not with the deck
vendor/             reveal.js 5.1.0 + DM Sans / DM Serif Display woff2
```

### Driving the diagram from a slide

Slides declare what the diagram should be doing; `js/director.js` does the rest. Nothing
intercepts the keyboard — reveal keeps ownership of navigation, the progress bar, speaker
view and PDF export.

```html
<section data-strata-layout="aside" data-strata-active="support"> … </section>
```

| Attribute | Values | Meaning |
|---|---|---|
| `data-strata-layout` | `full` | centred at full size, with heading, caption and detail panel |
| | `aside` | parked left at ~40%, clearing the right column for project media |
| | `corner` | small locator, bottom-left |
| | `off` | hidden — fades out *where it stands*, keeping its current position |
| `data-strata-active` | `support` `transfer` `integration` `none` | which stratum is lit |
| `data-strata-variant` | `panel` `horizon` | which design the diagram uses (see below) |
| `data-strata-park` | `left` `right` | which side the mark parks at under `aside` |

### Two designs

The diagram has two treatments. The deck picks one on `#stage`; any slide may override it
with `data-strata-variant`.

```html
<div id="stage" data-variant="panel"> … </div>
```

**`panel`** (default) — the mark with a detail card beside it, joined by a dotted
connector that starts on the mark's painted rim. The card is a wash of the stratum colour
under a seam-curved top edge, with a solid spine on the edge facing the mark. It carries
the tagline and the list and nothing else: the stratum is already named inside the mark
and pointed at by the connector, so a label and a numeral on the card were saying it a
third and fourth time.

**`horizon`** — the strata leave the mark. Both seams continue outward and, with a horizon
above and a floor below, divide the whole slide into three bands; the active one is washed
and carries its title to the left of the mark and its bullets to the right. The other two
stay bare paper with their boundaries drawn faint, so the slide reads as one section
through the ground.

The bands appear on the **first advance**, not on arrival — the opening view is the mark
by itself, and the profile cuts open as the first stratum lights. That falls out of the
fragment steps: no active stratum, no bands.

Geometry notes, because they are not arbitrary:

- The horizon is SEAM1 lifted 185 and the floor SEAM2 dropped 165. Those depths are set by
  the mark: the horizon has to clear the **top** of the circle and the floor its bottom
  (~21px at the tightest), so the Support band contains the whole support region of the
  disc rather than cutting across it.
- Each boundary leaves the mark along the mark's own tangent, then runs a further
  half-wave of its own. Without that second part a boundary goes flat the moment it leaves
  the disc, and the mark looks like the only place anything happens.
- The wash and all four boundaries fade out over the last ~96px into each slide edge, under
  one shared mask, so a line and the ground it bounds fade in step. The ramp is short on
  purpose: it has to read on a 2.5px stroke without hollowing out the ground under the
  text. The title column starts at x=54, inside the ramp, but it sits on an 11% wash, so
  67% of 11% is a difference nobody can see.
- Bullets are 17px. That is a ceiling, not a preference — 18px overruns the Transfer band,
  which is the thin one. Adding a fifth bullet will overrun it too.
- The mark is drawn at 550px here, the same size it is at `aside`, so between the overview
  and a project slide it travels without also resizing.

The bands are drawn into `#strata-bands`, a second layer inside `#stage` that is
deliberately **not** transformed: they run the full width of the slide, so they are
authored in slide coordinates. Keeping them out of `#strata`'s transform is what lets the
mark travel and the bands swap independently.

### Which side a project sits on

Under `aside` the mark parks on one side and the project column takes the other. Every
stratum parks **left**, so every project slide puts its content on the right.

A slide can opt out with `data-strata-park="right"`, which mirrors the mark about the slide
centre and moves that slide's content to the left. `js/director.js` resolves the value and
writes it back onto the slide, so `css/deck.css` flips `section.project` and the connector
follows without the rule living in two places. Both parks use the same scale, so moving
between them is a pure translate.

### Card-to-video handoff

A project card can hold a video's opening frame and hand it to the next slide, which plays
the same file fullscreen. `js/handoff.js` runs a FLIP between the two, so the frame appears
to grow out of the card. Tag the pair with a shared name:

```html
<video data-handoff="ll-explorer" poster="assets/demo-poster.jpg" muted playsinline>…</video>
<video data-grow-from="ll-explorer" data-autoplay controls muted playsinline>…</video>
```

The card's video has no `data-autoplay`, so it sits on its poster. The animation runs
forwards only — arriving at the video slide any other way (a deep link, or stepping back
from the following slide) simply shows the video — and is skipped under
`prefers-reduced-motion`.

Both attributes also work on a `.fragment` inside a slide, where the last visible one
wins. That is how the overview slide steps through the strata one advance at a time:

```html
<span class="fragment strata-step" data-strata-active="support"></span>
```

Layout geometry lives in `css/stage.css` as a handful of `translate(...) scale(...)`
rules, with the arithmetic written out — adjust there, not in the JS. The band curves are
the exception: they are generated in `js/strata-diagram.js` from the mark's own seam
anchors, so they follow the mark wherever it is placed.

### Alignment

The stage mirrors reveal's own `--slide-width`, `--slide-height` and `--slide-scale`
custom properties, which reveal 5.x publishes on `.reveal-viewport`. That reproduces the
transform reveal applies to `.slides` exactly, so the diagram stays registered with slide
content at any window size with no JavaScript and no resize handler.

### Two things that will bite you

- **`display: flex` does not work on a slide section.** reveal writes `display: block`
  inline on the visible slide, which beats any stylesheet rule. Vertical centring is
  already handled by reveal's `center: true`. The title slide is the exception and uses
  `!important` deliberately.
- **Slide sections are `content-box`.** reveal sizes them to exactly 1280x720, so this
  deck's 40px side padding hangs off the right edge of the stage. Prose wraps long before
  anyone notices; anything pinned right does not. Any slide with a right-anchored element
  needs to opt into `border-box`.
- **`slidechanged` never fires for the initial slide.** The director also listens for
  `ready`; that handler is load-bearing, not belt-and-braces.

## Live audience quiz (removed)

During the talk on 24 September 2026, seven slides put a question and a QR code on screen
and filled in live as the room voted (built on the vendored
[slide-quiz](https://github.com/anycable/slide-quiz) plugin, relayed through AnyCable and
the Netlify functions in `backend/`). After the talk they were taken out so the deck could
stay on the website as a static record: the quiz slides, `quiz.html`, `js/quiz-config.js`,
`js/quiz-capture.js`, `vendor/slide-quiz/` and the quiz CSS. The last commit that still has
them is the parent of the one that removed them; check it out to see or reuse the setup.

`backend/` is kept here because it is the source of the relay that stores the answers.
They can still be downloaded, one row per submission, from

```
https://dml-quiz-relay.netlify.app/.netlify/functions/quiz-export?token=<QUIZ_EXPORT_TOKEN>&group=iat-statusseminar-2026
```

Once they are written up, delete the `quiz-answers` Blobs store and take the Netlify site
down; nothing in the deck depends on it any more.

## Known limits

- **PDF export drops the diagram.** `?print-pdf` makes `.slides` static and paginates it;
  a positioned overlay cannot follow. The deck is built to be presented live.
- **The Living Lab Explorer demo video is in German** while the rest of the deck is in
  English.

## Regenerating the vendored fonts

Only needed if the brand type changes. Fetch the Google Fonts CSS for `DM Sans` and
`DM Serif Display`, download each `.woff2` it references into `vendor/fonts/`, and rewrite
the `src:` URLs in `vendor/fonts/fonts.css` to the local filenames.

## TODO before presenting

- [x] Set the seminar date (`README.md` and the title slide)
- [ ] Fill the project slides: names, one-line contributions, URLs
- [ ] Choose the Integration exemplar (candidates: PAVE model catalogue, PB3 data
      catalogue, GeoNode spatialisation)
- [ ] Capture the iframe fallback screenshots into `assets/`
- [ ] Write "Where we go next"

---

# IAT-Statusseminar 2026 — DML-Service-Arbeitsgruppe

| | |
|---|---|
| **Veranstaltung** | IAT-Statusseminar 2026 |
| **Vortragender** | Benjamin Samuel Black |
| **Datum** | 24. September 2026 |

Vorstellung der Aktivitäten der DML-Service-Arbeitsgruppe, aufgebaut als Gang durch die
drei Schichten des Servicekonzepts — Support, Transfer, Integration — mit
Beispielprojekten für jede Schicht.

Zum Öffnen genügt `index.html` im Browser: kein Build-Schritt, kein Server, keine
Netzwerkverbindung nötig (reveal.js und die Schriften liegen unter `vendor/`). Die
eingebetteten `iframe`s der Projektfolien benötigen jedoch Internet; als Rückfallebene
liegt jeweils ein Screenshot darunter.

Die Live-Publikumsfragen aus dem Vortrag wurden danach entfernt; der Foliensatz bleibt
als statische Aufzeichnung auf der Website (siehe *Live audience quiz (removed)*).
