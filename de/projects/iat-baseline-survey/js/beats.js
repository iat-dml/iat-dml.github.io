// ============================================================================
// beats.js -- the running order. SPEC section 5, one entry per clicker press.
//
// Layer 2 (SPEC 2): WHAT is on stage at each press. It knows nothing about
// keys, clickers or Reveal.js -- the shell only ever asks for beat i.
//
// Every beat is a complete state, never a delta from the previous one. That is
// what makes going BACKWARDS, and jumping straight to a beat in rehearsal,
// land on exactly the picture going forwards does.
// ============================================================================

/**
 * SPEC 6.6: settled in the layout lab and fixed for the deck. These are not
 * runtime switches, so nothing here reads a URL or a key.
 */
export const DECK_OPTS = Object.freeze({
  labels: true,
  bridge: true,
  labLinks: true,
  icons: true,
  morph: true,
  legend: true,          // the stage shows it from scene 2 onwards
  nuts3: false,
  projector: false,      // a palette, not an opt: see deck.js
  // The four lab checkboxes that are really beats. Off unless a beat says so.
  responses: false,
  truePos: false,
  interest: false,
  demand: false,
  // Callouts (top/bottom rings, bold labels, row leaders) arrive on their own
  // press, one after the diagram (review of 16 September 2026).
  highlight: false,
  // Scene 4.5's second press: the researcher dots land in cohort bubbles that
  // are already on stage, so the room reads the grid and the size of each
  // cohort before it is asked to count anything inside them.
  matrixDots: false,
  // Scene 5.2's second press: the cohort bubbles and their dots arrive on the
  // empty grid, so the room reads the two axes before the picture fills in.
  partCells: false,
  // Scene 6's second press: the research themes come in around the bubbles.
  monThemes: false,
  // Scene 7's second press: the tier-1 codes around their dimensions.
  cloudTerms: false,
});

// Cut on review (14 September 2026): 1.2 (the contraction), 4.3 (links
// re-weighted to interest) and 5.1 (the beeswarm). The stage can still draw
// all three -- the lab previews them -- they are simply not presses any more.
// A `+` beat is the same picture with its callouts switched on (review of
// 16 September 2026): the presenter explains the diagram, then presses to
// point at the result.
const HL = { highlight: true };

export const BEATS = [
  { id: '0.5a', view: 'invite', title: 'Who was asked' },
  { id: '0.5b', view: 'invite', title: 'Who answered', opts: { responses: true } },

  { id: '1.1', view: 'map', title: 'The Living Labs', opts: { truePos: true } },

  { id: '2', view: 'people', title: 'Participants' },
  { id: '3', view: 'themes', title: 'Research themes' },
  { id: '3+', view: 'themes', title: 'Research themes: highlights', opts: HL },

  { id: '4.2', view: 'uc', title: 'Innovation fields: experience' },
  { id: '4.2+', view: 'uc', title: 'Innovation fields: highlights', opts: HL },

  // Split on review (23 September 2026): the grid and the empty cohort bubbles
  // first, then the researchers inside them. `4.5a` still lands on the full
  // picture, so every rehearsal link written before the split still works.
  { id: '4.5a0', view: 'matrix', title: 'Lab × innovation field: the grid' },
  { id: '4.5a', view: 'matrix', title: 'Lab × innovation field',
    opts: { matrixDots: true } },
  { id: '4.5a+', view: 'matrix', title: 'Lab × innovation field: highlights',
    opts: { matrixDots: true, ...HL } },
  { id: '4.5b', view: 'matrix', title: 'Unmet demand',
    opts: { matrixDots: true, demand: true } },
  { id: '4.5b+', view: 'matrix', title: 'Unmet demand: highlights',
    opts: { matrixDots: true, demand: true, ...HL } },

  // Moved on review (23 September 2026): who the labs work WITH now leads
  // straight into HOW they work with them, instead of sitting back with the
  // research themes. Both are network scenes, so the dots converge out of the
  // matrix and straight on into the participation grid.
  { id: '3.5', view: 'stake', title: 'Stakeholder groups' },
  { id: '3.5+', view: 'stake', title: 'Stakeholder groups: highlights', opts: HL },

  // Rebuilt on review (16 September 2026): the ladder wall became a lab x
  // activity matrix mirroring 4.5. The wall is still in the lab as `spine`.
  // Split on review (23 September 2026): the grid and its axis labels alone
  // first, then the cohorts and their dots.
  { id: '5.2a', view: 'part', title: 'Participation and Co-design: the grid' },
  { id: '5.2b', view: 'part', title: 'Participation and Co-design',
    opts: { partCells: true } },
  { id: '5.2+', view: 'part', title: 'Participation: who can pair up',
    opts: { partCells: true, ...HL } },

  // Rebuilt on review (17 September 2026): topics as bubbles of participant
  // dots, then the themes, then the theme x topic lines.
  { id: '6.1', view: 'mon', title: 'Monitoring interest' },
  { id: '6.2', view: 'mon', title: 'Monitoring: research themes',
    opts: { monThemes: true } },
  { id: '6.2+', view: 'mon', title: 'Monitoring: theme links',
    opts: { monThemes: true, ...HL } },

  // Added 17 September 2026: the coded free-text answers on shared data.
  // The dimensions first, then the codes within them.
  { id: '7.1', view: 'cloud', title: 'Shared data: dimensions' },
  { id: '7.2', view: 'cloud', title: 'Shared data: codes',
    opts: { cloudTerms: true } },
];

/** The full opts object the stage draws beat `i` with. */
export function beatOpts(i) {
  return { ...DECK_OPTS, ...BEATS[i].opts };
}

/** Beat index for an id such as '4.3', or -1. */
export function beatIndex(id) {
  return BEATS.findIndex(b => b.id === id);
}
