# IAT Statusseminar 2026 — DML Service Working Group

| | |
|---|---|
| **Event** | IAT Statusseminar 2026 |
| **Presenter** | Benjamin Samuel Black |
| **Date** | TODO |

Presentation of the activities of the DML service working group, structured as a walk
through the three strata of the service concept — Support, Transfer, Integration — with
exemplar completed projects for each.

## Running it

Open `index.html` in a browser. No build step, no server, no network: reveal.js and the
brand fonts are vendored under `vendor/`. It works from a USB stick.

The project slides embed live `iframe`s, which do need the network. Each has a screenshot
underneath as a fallback, so a blocked or slow iframe degrades to a still rather than to
blank — see the TODO list below for the ones still to capture.

The two audience-quiz slides near the end are the one part that genuinely needs the
internet, and two deployments: see [Live audience quiz](#live-audience-quiz). Run offline
they still draw their question, their empty bars and a QR code, so the deck never breaks
-- the code just points somewhere that is not serving.

Keys: arrows or space to advance, `S` for speaker view with notes, `F` for fullscreen,
`ESC` for the slide overview.

## How it is built

Hand-rolled reveal.js 5.1.0 rather than Quarto, because the concept diagram has to
**shrink, travel and fade across slide boundaries** — it grows from a corner locator to a
half-slide panel and hands off to a fullscreen video. That means it cannot be re-mounted
per slide, so it lives in a persistent `#stage` layer *outside* `.slides` and is driven
imperatively.

```
index.html          slides; the deck is authored here
css/brand.css       brand tokens, ported from the dml Quarto extension's _brand.yml
css/deck.css        typography and slide styling, plain-CSS port of its custom.scss
css/stage.css       the persistent diagram layer and its layout states
js/strata-diagram.js  the diagram, refactored from the website's dml-concept-diagram.js
js/director.js      maps slide state onto diagram state
js/handoff.js       grows a project card's still into the next slide's fullscreen video
js/deck.js          Reveal.initialize
js/quiz-config.js   AnyCable settings shared by the deck and quiz.html
js/quiz-capture.js  keeps the answers past the talk; "E" exports them as CSV
quiz.html           audience voting page, opened from the QR code
backend/            a separate Netlify site: the quiz's relay functions, the
                    durable answer store and its export endpoint -- deployed
                    on its own, not with the deck
vendor/             reveal.js 5.1.0 + DM Sans / DM Serif Display woff2
                    + slide-quiz 0.5.2 (see vendor/slide-quiz/README.md)
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
  already handled by reveal's `center: true`. The title slide and the two quiz slides are
  the exceptions and use `!important` deliberately -- the quiz rule is scoped to
  `.present` so hidden slides still obey reveal's `display: none`.
- **Slide sections are `content-box`.** reveal sizes them to exactly 1280x720, so this
  deck's 40px side padding hangs off the right edge of the stage. Prose wraps long before
  anyone notices; anything pinned right does not. `.quiz-slide` opts into `border-box` for
  that reason, and any future slide with a right-anchored element will need to as well.
- **`slidechanged` never fires for the initial slide.** The director also listens for
  `ready`; that handler is load-bearing, not belt-and-braces.

## Live audience quiz

Seven slides through the talk put a question and a QR code on the screen and fill in as
the room votes: an icebreaker straight after the mission, one question opening each
stratum, and three at the end under *Gathering further ideas for training and support*.

| # | Where | Slide | Type | Question |
|---|---|---|---|---|
| 1 | after the mission | `icebreaker-data-afterlife` | multiple choice | Your project is finished and the paper is out. What happens to the data? |
| 2 | opens Support | `support-reproducibility` | multiple choice | Could a colleague reproduce the analysis in your last paper -- figures and tables included -- from your files alone? |
| 3 | opens Transfer | `transfer-practice-partners` | multiple choice | How do your results currently reach practice partners? |
| 4 | opens Integration | `integration-reusable-assets` | free text | Name a dataset, model or tool from your project that others in IAT could reuse. |
| 5 | end | `strata-priority` | multiple choice | Which stratum matters most to you -- or where is support missing? |
| 6 | end | `training-needs` | free text | Which aspect of data or modelling do you want support or training in? |
| 7 | end | `training-format` | multiple choice | Which training format works best for you? |

Each is written as `data-quiz-*` attributes on an otherwise ordinary `<section>`; the
plugin ([slide-quiz](https://github.com/anycable/slide-quiz), vendored under
`vendor/slide-quiz/`) appends the bars, the cloud and the QR code itself. Multiple choice
draws live bars, free text a live word cloud.

The icebreaker is there to get phones out early. Its slide, and `quiz.html` itself, tell
the audience to **keep the page open**: between quiz slides it reads *Waiting for the next
question*, and each later question arrives on it without a rescan. The three strata
questions are laid out like project slides -- `data-strata-layout="aside"` with their
stratum active, class `quiz-slide--aside` -- so the mark is already parked and lit when the
question appears and stays put into the stratum's first project. The quiz fills the same
right-hand column the project media does, with a smaller QR code, bars in the stratum's
colour and no kicker or hint above the question; see *Quiz beside the diagram* in `css/deck.css`.

Option text lives inside a single-quoted JSON attribute, so it cannot contain an
apostrophe -- write *do not*, not *don't*.

Questions 6 and 7 matter most afterwards -- what to teach and how. Nothing is stored
server side by the plugin, so the deck and the relay each keep a copy: see
[Keeping the answers](#keeping-the-answers).

### What it needs to actually work

Voting travels deck -> AnyCable -> phones, and the credential that lets anything broadcast
to the cable must never reach the browser. That splits the quiz across two hosts:

| Half | Lives on | Why there |
|---|---|---|
| the deck and `quiz.html` | GitHub Pages, in `iat-dml.github.io` | where the group's public pages already are |
| the two relay functions | a small Netlify site, `backend/` | Pages is static; something has to run them |

They talk across origins by design -- the functions send `Access-Control-Allow-Origin` and
answer the preflight -- and `js/quiz-config.js` is the one place that knows both halves.

Three steps, once:

1. **Create a free AnyCable Plus cable.** Sign in at
   [plus.anycable.io](https://plus.anycable.io), create a cable, and **clear the
   application secret** -- that empty secret is what puts it in public-streams mode, which
   is what this plugin expects. Note the **WebSocket URL** and the **Broadcast URL**. The
   free tier covers 2,000 concurrent connections; a Statusseminar is nowhere near that.

2. **Paste the WebSocket URL into `js/quiz-config.js`** as `wsUrl`. It is a client-side
   value by design -- the audience's browsers connect straight to it -- and is the only
   quiz value that belongs in git.

3. **Deploy both halves.** Below.

### Deploying the relay (backend/)

A Netlify site whose only job is to run `quiz-answer` and `quiz-sync`. It serves a
one-paragraph placeholder page so that visiting it is not confusing. Netlify is never
connected to GitHub here: `netlify deploy` uploads this one folder, so the private
`knowledge-management` repo is never cloned onto a build machine and no GitHub App is
installed on the org.

```sh
cd presentations/iat-statusseminar-2026/backend
npm install                     # so the functions' two deps are on disk to bundle
npx netlify login
npx netlify deploy --prod       # prompts to create a site the first time
npx netlify env:set ANYCABLE_BROADCAST_URL https://<your-cable>.fly.dev/_broadcast
npx netlify deploy --prod       # again, so the functions pick the variable up
```

> **Run these from the repository's real path, not through a junction.** If you reach the
> repo through a link such as `C:\git\knowledge-management`, the Netlify CLI resolves the
> working directory and the repository root by different routes and refuses everything
> with *Configuration property "build.base" ... must be inside the repository root
> directory*. Nothing is wrong with the config -- it is only where you are standing. In
> PowerShell:
>
> ```powershell
> $real = (Get-Item "C:\git\knowledge-management").Target[0]
> cd (Join-Path $real "presentations\iat-statusseminar-2026\backend")
> ```
>
> (`.Target` is an array in Windows PowerShell 5.1, hence the `[0]`.)

`npm install` here is slow the first time -- the repo lives inside OneDrive, so every file
of `node_modules` is written through the sync client. It is ignored by git and never
uploaded to Netlify, and you only need it again when the dependencies change.

`ANYCABLE_BROADCAST_URL` is the cable's **Broadcast** URL -- the `https://.../_broadcast`
one, *not* the `wss://.../cable` one that goes in `js/quiz-config.js`. Same host,
different scheme and path. `ANYCABLE_BROADCAST_KEY` is only needed if the cable was given
a secret, and ours was not. `QUIZ_EXPORT_TOKEN` gates the answer export -- see
[Keeping the answers](#keeping-the-answers). None of them belong in git.

`package.json` here is not a build. It exists because Netlify's dependency install only
reads a `package.json` in the site's base directory, and the functions import
`@anycable/serverless-js` and `valibot`.

Then paste the site's origin into `js/quiz-config.js` as `functionsOrigin`, with no
trailing slash. Setting it to `""` falls back to same-origin relative paths, which is what
you want only if the deck is ever served from that Netlify site itself.

### Deploying the deck (GitHub Pages)

Copy this folder into `iat-dml.github.io` and let Pages serve it. Two things to get right:

- **Quarto must copy it verbatim.** `iat-dml.github.io` is a Quarto project, and Quarto
  will not walk a hand-rolled `index.html` to discover `vendor/`, `assets/` or `js/`.
  Declare the folder under `project: resources:` in that repo's `_quarto.yml` -- the same
  move this repo already makes for `repo-structure/repo-structure.html`.
- **A subpath is fine.** The deck will sit at something like
  `iat-dml.github.io/talks/statusseminar-2026/`. Nothing needs configuring: the QR code is
  built from `window.location`, so it resolves `quiz.html` against wherever the deck
  actually is.

### Checking it worked

- `https://<relay>.netlify.app/.netlify/functions/quiz-sync` returns **405 Method not
  allowed**, not 404. A 404 means the functions did not deploy -- check the deploy log's
  *Functions bundling* section. If they bundled but fail at runtime on a missing module,
  the dependency install was skipped: set the build command to a literal `npm install`.
- The deck's `quiz.html` on Pages loads and says *Waiting for the next question*. If it
  instead says the functions are not deployed, `functionsOrigin` is wrong or unset.
- Open the deck, walk to a quiz slide, and watch the participant counter on your phone
  tick to 1. No red banner along the bottom of the slide means the sync round trip works.

### Rehearsing before any of it is deployed

`npx netlify dev --live` in `backend/` runs the functions locally and gives you a public
tunnel URL; put that in `functionsOrigin` and open the deck from disk. Create a `.env`
beside the functions with `ANYCABLE_BROADCAST_URL=...` for it to read.

The audience page is `quiz.html`, a sibling of the deck, and the QR code is generated from
the deck's own URL -- so a subdirectory deploy or a rename needs no configuration change.
The questions are not repeated on that page: it receives whichever one the presenter is
standing on, over the cable.

Vercel works too, in place of the Netlify half: its functions live in `api/`, and
`functionsOrigin` then needs the endpoint paths adjusting to match. Upstream ships the
Vercel variants -- see `vendor/slide-quiz/README.md`.

### Keeping the answers

The plugin stores nothing server side: the tallies live in the presenting tab. That is
fine for the ten minutes they are on screen and no use at all afterwards, so
`js/quiz-capture.js` adds two things, both client side and needing no deployment.

**It saves as you go.** Every vote is mirrored into `localStorage`, which -- unlike the
`sessionStorage` the plugin uses -- outlives the tab, the browser quitting and the laptop
restarting. Nothing has to be remembered on the day; the answers are simply still there
afterwards. Reopening the deck in the same browser logs how many it is holding.

**Press `E` to download them** as a CSV, listed in reveal's `?` help overlay. One row per
distinct answer:

```
question_number,question_id,question,type,answer,option_text,votes,question_total
5,strata-priority,Which stratum matters most...,choice,A,"Support — RDM, software practice, training",1,2
6,training-needs,Which aspect of data or modelling...,text,quarto,,2,3
6,training-needs,Which aspect of data or modelling...,text,"git, branching",,1,3
```

`question_number` is the question's position in the deck, 1 to 7.

A toast confirms the save, because a file landing silently in a downloads folder is
indistinguishable from a keypress that did nothing.

Two things to know about the free-text answers. The plugin lowercases and trims them to
build the word cloud, so `Quarto` and `quarto` arrive as one row with a count of two --
you get the tally, not the individual submissions. And the copy is tied to **the browser
profile you presented from**: export from that machine, or run
`DeckQuizCapture.export()` in its console later. `DeckQuizCapture.snapshot()` returns the
same data as an object if you would rather work with JSON.

#### The independent copy

The browser copy is no help if someone else is driving the deck, or the machine dies. So
the relay keeps its own: `quiz-answer.mts` sees every vote anyway, and writes each one to
Netlify Blobs as it relays it. Nothing about it depends on which laptop is presenting.

Each answer is stored at `answers/<quizGroupId>/<quizId>/<sessionId>` -- one blob per
person per question. A second vote from the same phone *overwrites* the first, so the
record follows the same "you may change your answer" rule the room sees, and nothing is
ever read-modify-written, so simultaneous votes cannot lose each other.

Unlike the word cloud, this keeps answers **exactly as typed**: `Quarto` and `quarto` stay
separate rows, and you get each individual submission rather than a tally.

A vote only carries its quiz id and, for multiple choice, a bare letter. So `quiz-sync.mts`
also stores the question the presenter is showing -- wording, type, options and position
-- at `questions/<quizGroupId>/<quizId>`, overwritten on every slide change. The export
joins the two and sorts by deck order:

```
quiz_group_id,question_number,quiz_id,question,type,answer,option_text,session_id,submitted_at
iat-statusseminar-2026,2,support-reproducibility,Could a colleague reproduce...,choice,B,With some help from me,3f9c...,2026-09-24T10:02:11.000Z
iat-statusseminar-2026,4,integration-reusable-assets,Name a dataset...,text,PB3 soil data,,8a21...,2026-09-24T10:14:40.000Z
```

A question is only recorded once the deck has actually been shown on it with the relay
live, so answers to one that never synced export with those columns blank.

Download them with a URL -- no tooling, no access to the presenting machine:

```
https://dml-quiz-relay.netlify.app/.netlify/functions/quiz-export?token=<token>&group=iat-statusseminar-2026
```

It returns a CSV as a file download; add `&format=json` for the raw questions and answers, or drop
`&group=` for everything ever collected. The token is `QUIZ_EXPORT_TOKEN`, set alongside
`ANYCABLE_BROADCAST_URL` in the Netlify dashboard. With it unset the endpoint refuses
every request rather than serving the audience's answers to whoever guesses the URL.

```sh
npx netlify env:set QUIZ_EXPORT_TOKEN "$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))")"
npx netlify deploy --prod
```

Two caveats. Blobs reads are strongly consistent here, but a `list` immediately after the
last vote can still lag -- if the count looks short, wait a minute and export again. And
the answers stay until deleted: `npx netlify blobs:delete quiz-answers <key>`, or delete
the whole store from the dashboard once the training list is written up.

#### Working on the functions

`npm run check` type-checks them. Netlify bundles `.mts` with esbuild, which strips types
without looking at them, so a mistake otherwise surfaces as a runtime error on a deployed
function. `npx netlify dev` runs the whole relay locally, Blobs included, reading a `.env`
beside it -- that is how the capture above was tested before it was ever deployed.

Note `functions/lib/`: Netlify publishes every `.mts` at the top of `functions/` as an
endpoint, so the two helper modules live a directory down. Left at the top they answered
500 on public URLs of their own.

### On the day

Open the deck, land on the first quiz slide and check the QR code resolves on your own
phone before the room does. If the red *sync failed* banner appears along the bottom, the
functions are not deployed or `ANYCABLE_BROADCAST_URL` is unset; the deck carries on
regardless, so it is recoverable mid-talk by simply not dwelling on the quiz slides.

Say the icebreaker's instruction out loud as well: scan once, keep the page open. A phone
that locks its screen may drop the connection; reopening the tab reconnects it, and the
nudge below brings the current question back.

Reloading the deck keeps the results. Resetting between two runs of the same talk means
closing the tab: the plugin's own copy lives in `sessionStorage`, so it goes with the tab
and reconnecting phones see a zero total and may vote again. `js/quiz-capture.js` keeps a
second copy that deliberately *survives* that, so a reset does not cost you the answers --
export them first if the earlier run mattered.

**If a phone sits on "Waiting for the next question", step back one slide and forward
again.** The presenter broadcasts the current question on a slide change and then only
every two minutes as a keepalive -- someone *joining* does not prompt it. Late arrivals
are normally covered anyway, because the participant asks the cable for the last five
minutes of history when it connects -- tested on both questions, and it lands about five
to ten seconds after the page opens, so give a phone that long before assuming it is
stuck. The nudge is the fix for the case where that does not land, and
it costs nothing: the audience sees the same slide reappear.

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

- [ ] Set the seminar date (`README.md` and the title slide)
- [ ] Fill the project slides: names, one-line contributions, URLs
- [ ] Choose the Integration exemplar (candidates: PAVE model catalogue, PB3 data
      catalogue, GeoNode spatialisation)
- [ ] Capture the iframe fallback screenshots into `assets/`
- [ ] Write "Where we go next"
- [x] Create the AnyCable Plus cable and paste its WebSocket URL into `js/quiz-config.js`
- [x] Deploy `backend/` to Netlify with `ANYCABLE_BROADCAST_URL` set, and paste the site's
      origin into `js/quiz-config.js` as `functionsOrigin`
      (`https://dml-quiz-relay.netlify.app`, end-to-end tested)
- [ ] Set `QUIZ_EXPORT_TOKEN` on the relay and redeploy it, so the durable answer
      capture and its export endpoint go live
- [ ] Redeploy `backend/` so `quiz-sync` starts recording questions for the export
- [ ] Publish the deck through `iat-dml.github.io`, then dry-run all seven quiz slides from
      a real phone on conference wifi, leaving the page open between them
- [ ] Clear rehearsal answers before the talk (delete the `quiz-answers` store, or change
      `quizGroupId` in `js/quiz-config.js`)

---

# IAT-Statusseminar 2026 — DML-Service-Arbeitsgruppe

| | |
|---|---|
| **Veranstaltung** | IAT-Statusseminar 2026 |
| **Vortragender** | Benjamin Samuel Black |
| **Datum** | TODO |

Vorstellung der Aktivitäten der DML-Service-Arbeitsgruppe, aufgebaut als Gang durch die
drei Schichten des Servicekonzepts — Support, Transfer, Integration — mit
Beispielprojekten für jede Schicht.

Zum Öffnen genügt `index.html` im Browser: kein Build-Schritt, kein Server, keine
Netzwerkverbindung nötig (reveal.js und die Schriften liegen unter `vendor/`). Die
eingebetteten `iframe`s der Projektfolien benötigen jedoch Internet; als Rückfallebene
liegt jeweils ein Screenshot darunter.

Die sieben Publikumsfragen (eine zum Einstieg, je eine zu Beginn jeder Schicht und drei
am Ende) brauchen zusätzlich zwei Veröffentlichungen im Netz — den Foliensatz selbst
auf GitHub Pages und die beiden Relay-Funktionen aus `backend/` auf einer kleinen
Netlify-Site — damit das Publikum per QR-Code abstimmen kann; die Einrichtung ist oben
unter *Live audience quiz* beschrieben. Ohne sie läuft der Foliensatz unverändert weiter, der QR-Code zeigt dann
nur ins Leere.
