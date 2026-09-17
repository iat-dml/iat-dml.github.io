// ============================================================================
// deck.js -- boots the presentation. Wires the three layers together and does
// nothing else.
//
//   data.json + layout.json  ->  stage (layer 2)  <-  beats  <-  shell (layer 3)
//
// It renders from the FROZEN layout (SPEC 2.2). computeLayout is never called
// here, so no force simulation runs in the room and rehearsal and performance
// are the same picture by construction.
// ============================================================================

import * as T from './theme.js';
import { loadModel } from './model.js';
import { createStage } from './stage.js';
import { BEATS, beatOpts, beatIndex } from './beats.js';
import { createShell } from './shell.js';

const el = id => document.getElementById(id);

const query = new URLSearchParams(location.search);
// The higher-contrast variant for a washed-out beamer (SPEC 7). A property of
// the room, decided before the talk, so it is a URL flag rather than a key a
// presenter could hit by accident: index.html?projector=1
if (query.get('projector') === '1') T.setProjector(true);

const [model, layout] = await Promise.all([
  loadModel(),
  fetch('data/layout.json').then(r => {
    if (!r.ok) throw new Error(`could not load data/layout.json (${r.status})`);
    return r.json();
  }),
]);

const stage = createStage(el('deckStage'), { model });
stage.setLayout(layout, layout.params);

const shell = createShell({
  count: BEATS.length,
  idOf: i => BEATS[i].id,
  indexOf: beatIndex,
  go(i, { animate }) {
    stage.show(BEATS[i].view, beatOpts(i), { animate });
    el('hud').textContent =
      `${BEATS[i].id} · ${BEATS[i].title}  (${i + 1}/${BEATS.length})`;
  },
  onKey(key) {
    // Most clickers have a "blank screen" button, and it sends B or a period.
    if (key === 'b' || key === 'B' || key === '.') {
      document.body.classList.toggle('blank');
    } else if (key === 'f' || key === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    } else if (key === 'h' || key === 'H') {
      el('hud').hidden = !el('hud').hidden;
    }
  },
});

// For verify_deck.mjs and console use in rehearsal. The deck never reads it.
window.DECK = {
  get beat() { return BEATS[shell.index].id; },
  get index() { return shell.index; },
  beats: BEATS.map(b => b.id),
  model,
  layout,
};
