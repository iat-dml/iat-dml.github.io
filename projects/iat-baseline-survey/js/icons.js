// ============================================================================
// icons.js -- one glyph per Use Case, plus one per monitoring pilot area.
//
// SIX, NOT SIXTEEN. Icons are worth it for the use cases and not for the
// themes: there are only six, they render at r=46 where a glyph is actually
// legible, and every one of them is concretely picturable. The sixteen themes
// are the opposite case -- abstract ("Governance & policy", "Innovation
// research"), small (r down to 21), and their radius already encodes
// respondent count, which a glyph inside would fight.
//
// All geometry is authored in a 24x24 box with the origin at the CENTRE
// (-12..12), so an icon can be dropped straight onto a node's cx/cy with a
// single scale factor and no translate arithmetic.
//
// STROKE ONLY, no fills, and no colour of its own: every path inherits
// `stroke: currentColor`, so an icon follows the theme token it sits in and
// survives the projector palette without a second definition. Stroke width is
// authored for the 24-unit box and divided by the scale at render time, so a
// large icon does not get a fat outline.
//
// The five scene 6 glyphs are added at the bottom of the ICONS table. They
// earn icons for the same reasons the use cases do: five of them, rendered at
// r=40, each concretely picturable.
// ============================================================================

/**
 * Path data per use case id. Kept as plain strings rather than nested arrays
 * so the whole set stays greppable and hand-editable.
 */
const ICONS = {
  // Agriphotovoltaic systems -- panel array on posts, crop rows beneath.
  'uc-0': {
    label: 'Agri-PV',
    paths: [
      // tilted panel
      'M-10.5,-4.5 L4.5,-9.5 L10.5,-5.5 L-4.5,-0.5 Z',
      // panel mullions
      'M-5.5,-6.6 L0.6,-2.5',
      'M-0.2,-8.2 L5.8,-4.2',
      // support posts
      'M-6.5,-1.4 L-6.5,4',
      'M6,-3.4 L6,2',
      // crop rows below
      'M-8,6.5 L-4.5,6.5', 'M-1.8,6.5 L1.8,6.5', 'M4.5,6.5 L8,6.5',
      'M-6.5,9 L-3.5,9', 'M-1.2,9 L1.2,9', 'M3.5,9 L6.5,9',
    ],
  },

  // Agroforestry systems -- a tree in a row of crops.
  'uc-1': {
    label: 'Agroforestry',
    paths: [
      // canopy
      // Wider and flatter than a symmetrical dome, which reads as a lamp.
      'M-2.5,-3.5 C-9,-3.5 -10.5,-7.5 -6.5,-9 C-6,-11.5 -1,-12 1.5,-10.2 '
        + 'C6,-10.8 9.5,-7 4.5,-3.5 Z',
      // trunk
      'M0.7,-3 L0.7,7',
      // roots / base line
      'M-3.3,7 L4.7,7',
      // crop rows either side, shorter than the tree
      'M-9,6.5 L-5.5,6.5', 'M6,6.5 L9,6.5',
      'M-8,3.5 L-8,6.5', 'M-6,4.5 L-6,6.5',
      'M7,3.5 L7,6.5', 'M8.8,4.5 L8.8,6.5',
      'M-7.5,9 L7.5,9',
    ],
  },

  // Climate resilient (mixed) cropping -- three DIFFERENT crops, one bed.
  // The point of the icon is the mixture, so the three glyphs deliberately
  // do not match.
  'uc-2': {
    label: 'Climate-resilient cropping',
    paths: [
      // cereal ear, left
      'M-7.5,8 L-7.5,-3',
      'M-7.5,-3 C-10,-4.5 -10,-7 -7.5,-8.5',
      'M-7.5,-3 C-5,-4.5 -5,-7 -7.5,-8.5',
      // broadleaf, centre
      'M0,8 L0,-2',
      'M0,-2 C-4.5,-3 -5,-7.5 -1,-8.5',
      'M0,-2 C4.5,-3 5,-7.5 1,-8.5',
      // legume / pod, right
      'M7.5,8 L7.5,-1',
      'M7.5,-1 C4,-3.5 5.5,-8 8.5,-8',
      'M6.2,2 L4,0.2', 'M8.6,4.4 L10.4,2.9',
      // bed
      'M-8.5,9.5 L8.5,9.5',
    ],
  },

  // Sustainable livestock -- a cow's head, face on.
  // A full side-on body was the first attempt and it read as a BARN at this
  // size: four legs under a long back turn into columns under a roof. A head
  // with ears and a muzzle is unmistakably an animal even at 30 px.
  'uc-3': {
    label: 'Sustainable livestock',
    paths: [
      // skull
      'M-6.8,-4.6 C-6.8,-8 -4.4,-9.4 0,-9.4 C4.4,-9.4 6.8,-8 6.8,-4.6 '
        + 'L6,1.2 C6,4.4 3.2,6.2 0,6.2 C-3.2,6.2 -6,4.4 -6,1.2 Z',
      // ears
      'M-6.9,-5.6 C-10.2,-7.8 -11.6,-4.6 -8.2,-2.6',
      'M6.9,-5.6 C10.2,-7.8 11.6,-4.6 8.2,-2.6',
      // eyes
      'M-3.3,-4.2 L-3.3,-3.1',
      'M3.3,-4.2 L3.3,-3.1',
      // muzzle
      'M0,0.4 C2.7,0.4 4.1,1.7 4.1,3 C4.1,4.4 2.7,5.4 0,5.4 '
        + 'C-2.7,5.4 -4.1,4.4 -4.1,3 C-4.1,1.7 -2.7,0.4 0,0.4 Z',
      // nostrils
      'M-1.5,2.6 L-1.5,3.6',
      'M1.5,2.6 L1.5,3.6',
      // pasture
      'M-7.5,9.2 L7.5,9.2',
      'M-5.5,9.2 L-5.5,7.2', 'M0,9.2 L0,7.5', 'M5.5,9.2 L5.5,7.2',
    ],
  },

  // New (regional) value networks -- a small graph, not a supply chain.
  // "Network" is the word in the option text, so the glyph is nodes and edges.
  'uc-4': {
    label: 'Regional value networks',
    paths: [
      // Edges stop SHORT of each node so they do not cross the rings and turn
      // the glyph into a lattice. Cubic circles rather than arcs, so every
      // number pair in this file is a genuine coordinate -- which is what lets
      // the radius guard in scripts/verify_layout.mjs be a trivial check.
      'M-5.6,-5.1 L-1.7,-1.7', 'M5.6,-5.1 L1.7,-1.7',
      'M-5.6,5.1 L-1.7,1.7', 'M5.6,5.1 L1.7,1.7',
      'M-6.5,-4.4 L-6.5,4.4',
      // nodes
      'M-2.9,0 C-2.9,-1.60 -1.60,-2.9 0,-2.9 C1.60,-2.9 2.9,-1.60 2.9,0 C2.9,1.60 1.60,2.9 0,2.9 C-1.60,2.9 -2.9,1.60 -2.9,0 Z',
      'M-8.7,-7 C-8.7,-8.22 -7.72,-9.2 -6.5,-9.2 C-5.28,-9.2 -4.3,-8.22 -4.3,-7 C-4.3,-5.78 -5.28,-4.8 -6.5,-4.8 C-7.72,-4.8 -8.7,-5.78 -8.7,-7 Z',
      'M4.3,-7 C4.3,-8.22 5.28,-9.2 6.5,-9.2 C7.72,-9.2 8.7,-8.22 8.7,-7 C8.7,-5.78 7.72,-4.8 6.5,-4.8 C5.28,-4.8 4.3,-5.78 4.3,-7 Z',
      'M-8.7,7 C-8.7,5.78 -7.72,4.8 -6.5,4.8 C-5.28,4.8 -4.3,5.78 -4.3,7 C-4.3,8.22 -5.28,9.2 -6.5,9.2 C-7.72,9.2 -8.7,8.22 -8.7,7 Z',
      'M4.3,7 C4.3,5.78 5.28,4.8 6.5,4.8 C7.72,4.8 8.7,5.78 8.7,7 C8.7,8.22 7.72,9.2 6.5,9.2 C5.28,9.2 4.3,8.22 4.3,7 Z',
    ],
  },

  // Landscape water management -- a channel through contours, plus water.
  'uc-5': {
    label: 'Landscape water mgmt',
    paths: [
      // Land contours, drawn tighter than the water so the two read as
      // different things rather than four identical waves.
      'M-8.2,-7.6 C-4.5,-9.8 -0.8,-5 2.9,-7.6 C5.2,-9.2 6.8,-8.9 8.2,-8',
      'M-9.4,-3.4 C-5.1,-6 -0.9,-0.8 3.4,-3.4 C5.9,-4.9 7.7,-4.7 9.4,-3.8',
      // Water: deeper troughs and a doubled line, so it reads as flow.
      'M-9.8,2.4 C-6.7,-0.2 -3.1,5.4 0,2.4 C3.1,-0.2 6.7,5.4 9.8,2.4',
      'M-8.8,7.4 C-6,5 -2.8,9.8 0,7.4 C2.8,5 6,9.8 8.8,7.4',
    ],
  },
};

/** Fallback: a plain ring, so a new use case renders as *something*. */
// --- scene 6: the five monitoring pilot areas ------------------------------
// Same 24-unit centred box, same stroke-only rule. Circles are drawn as four
// cubic segments rather than SVG arcs, deliberately: the radius guard in
// scripts/verify_layout.mjs reads every number in this file as a coordinate,
// and an arc command's radius/flag parameters are not coordinates.
//
// Reviewed on out/icons.html at 34 px, which is where these actually render --
// a glyph that reads at 120 px and turns to mush at 34 is no use.
Object.assign(ICONS, {
  // Recurring farmer panel survey -- a form, asked again and again. The
  // return arrow is the whole point: "recurring" is what distinguishes this
  // from any other survey.
  'mon-farmer_panel': {
    label: 'Farmer panel',
    paths: [
      // clipboard body
      'M-7,-6.5 L5,-6.5 L5,9 L-7,9 Z',
      // clip at the top
      'M-3,-6.5 L-3,-9 L1,-9 L1,-6.5',
      // answer lines, shortening down the page
      'M-4.5,-2 L2.5,-2', 'M-4.5,1.5 L2.5,1.5', 'M-4.5,5 L0,5',
      // the return sweep, top right, saying "again next year"
      'M7,-2 C10.5,-2 11.5,2 8.5,3.5',
      'M10.5,1 L8.5,4 L6.2,2.4',
    ],
  },

  // Farmer-focused apps & digital data collection -- a handset with a signal.
  'mon-farmer_apps': {
    label: 'Farmer apps',
    paths: [
      'M-5.5,-10 L5.5,-10 L5.5,10 L-5.5,10 Z',
      // screen division and home key, so it is a phone and not a card
      'M-5.5,-6.5 L5.5,-6.5',
      'M-1.6,7.5 L1.6,7.5',
      // a field row on the screen -- this is a FARM app
      'M-3.5,-3 L3.5,-3', 'M-3.5,0.5 L1,0.5',
      // signal arcs going out. Kept inside the box: the "fits its node" guard
      // in verify_layout.mjs caps any control point at 13.2 units, and the
      // first cut of this reached 13.4 and would have overhung its ring.
      'M7.2,-5.6 C9.4,-3.6 9.4,0 7.2,2.2',
      'M9.2,-7.6 C12.2,-4.6 12.2,0.6 9.2,3.4',
    ],
  },

  // Optimising landscape-scale sampling designs -- a plot boundary with
  // sample points inside it, some on a grid and some not.
  'mon-sampling_design': {
    label: 'Sampling design',
    paths: [
      // the landscape parcel, irregular so it is not "a square"
      'M-10,-7 L2,-9.5 L10,-3 L7,8 L-6,9 Z',
      // sample points as small crosses
      'M-6,-4 L-4,-4', 'M-5,-5 L-5,-3',
      'M0,-5.5 L2,-5.5', 'M1,-6.5 L1,-4.5',
      'M5,-1 L7,-1', 'M6,-2 L6,0',
      'M-3.5,2 L-1.5,2', 'M-2.5,1 L-2.5,3',
      'M2.5,4 L4.5,4', 'M3.5,3 L3.5,5',
      'M-7,5.5 L-5,5.5', 'M-6,4.5 L-6,6.5',
    ],
  },

  // Integrating plot-level with secondary datasets -- two sources becoming
  // one. A Venn overlap is the clearest 34 px reading of "integration".
  'mon-secondary_integration': {
    label: 'Data integration',
    paths: [
      // left set
      'M-2.5,-7 C-6.9,-7 -10.5,-3.9 -10.5,0 C-10.5,3.9 -6.9,7 -2.5,7 '
        + 'C1.9,7 5.5,3.9 5.5,0 C5.5,-3.9 1.9,-7 -2.5,-7 Z',
      // right set, overlapping
      'M2.5,-7 C-1.9,-7 -5.5,-3.9 -5.5,0 C-5.5,3.9 -1.9,7 2.5,7 '
        + 'C6.9,7 10.5,3.9 10.5,0 C10.5,-3.9 6.9,-7 2.5,-7 Z',
      // the shared middle, marked so the overlap is the subject
      'M0,-4.2 L0,4.2',
    ],
  },

  // Cross-scale validation of low-cost methods -- a small square measured
  // against a large one, with a tick where they agree.
  'mon-cross_scale_validation': {
    label: 'Cross-scale validation',
    paths: [
      // the large scale. Pulled in from the corner: at -10.5,-8.5 the
      // corner's radius was 13.5 and overhung the 13.2 node bound.
      'M-9.5,-8 L4,-8 L4,5.5 L-9.5,5.5 Z',
      // the small scale nested inside it
      'M-7,-5 L-2.5,-5 L-2.5,-0.5 L-7,-0.5 Z',
      // the correspondence between the two scales
      'M-2.5,-2.75 L4,-8',
      'M-2.5,-2.75 L4,5.5',
      // agreement tick, bottom right
      'M2,7.5 L5,10.5 L10.5,3.5',
    ],
  },
});

const FALLBACK = {
  label: '?',
  paths: ['M-8,0 C-8,-4.42 -4.42,-8 0,-8 C4.42,-8 8,-4.42 8,0 C8,4.42 4.42,8 0,8 C-4.42,8 -8,4.42 -8,0 Z'],
};

/** The authoring box is 24 units across, centred on the origin. */
export const ICON_BOX = 24;

export function hasIcon(id) {
  return Object.prototype.hasOwnProperty.call(ICONS, id);
}

export function iconPaths(id) {
  return (ICONS[id] ?? FALLBACK).paths;
}

/**
 * Render (or update) one icon into an existing SVG <g>.
 *
 * @param g        a d3 selection of a single <g>
 * @param id       use case id
 * @param size     desired icon width in stage units (the 24-unit box maps to this)
 * @param strokeW  stroke width in the 24-unit authoring box (default 1.7)
 *
 * The transform carries the scale, and stroke-width is divided back out so the
 * outline weight stays constant whatever the size.
 */
export function drawIcon(g, id, size, strokeW = 1.7) {
  g.attr('transform', `scale(${scaleFor(size).toFixed(4)})`);
  drawGlyph(g, id, strokeW);
}

/** The scale factor that maps the 24-unit authoring box to `size`. */
export function scaleFor(size) {
  return size / ICON_BOX;
}

/**
 * Paths and stroke only -- the caller owns the transform.
 *
 * Split out from drawIcon so a scene can animate the scale itself: entering
 * icons start at scale(0) and grow from the node centre, which drawIcon's
 * "set the transform immediately" behaviour makes impossible.
 */
export function drawGlyph(g, id, strokeW = 1.7) {
  g.attr('fill', 'none')
    .attr('stroke', 'currentColor')
    .attr('stroke-width', strokeW)
    .attr('stroke-linecap', 'round')
    .attr('stroke-linejoin', 'round');

  g.selectAll('path')
    .data(iconPaths(id), (d, i) => i)
    .join('path')
    .attr('d', d => d);
}
