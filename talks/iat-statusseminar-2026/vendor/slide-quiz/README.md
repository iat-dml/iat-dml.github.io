# slide-quiz (vendored)

Live audience quiz plugin for reveal.js — <https://github.com/anycable/slide-quiz>.
MIT licensed, by Evil Martians / AnyCable.

Vendored at **v0.5.2**, the same way `vendor/reveal/` is: the deck has no
build step and has to run from a USB stick, so the published `dist/`
files are committed rather than pulled from npm at load time. Both UMD
bundles are fully self-contained — no bare imports, no CDN calls.

| File | Used by | Global |
|---|---|---|
| `slide-quiz.umd.js` | `index.html` | `RevealSlideQuiz` (plugin at `.default`) |
| `slide-quiz.css` | `index.html` | — |
| `participant.umd.js` | `quiz.html` | `SlideQuizParticipant` |
| `participant.css` | `quiz.html` | — |

## Refreshing

```sh
npm pack slide-quiz@<version>          # or npm install slide-quiz@<version>
# copy dist/{slide-quiz,participant}.{umd.js,css} into this folder
# and functions/netlify/* into ../../netlify/functions/
```

Check two things after an upgrade: the UMD global names above, and
whether the plugin still *appends* its UI to the slide section rather
than replacing it — `css/deck.css` orders `.quiz-kicker` / `.quiz-hint`
around the injected block on that assumption.
