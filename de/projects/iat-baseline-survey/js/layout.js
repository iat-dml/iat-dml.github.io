// ============================================================================
// layout.js -- the BUILD-TIME layout tool (SPEC section 2.2).
//
// d3-force is non-deterministic: forceCollide and forceLink both call
// Math.random() to jiggle coincident nodes apart. Layout must be byte-identical
// in rehearsal and in performance, so:
//
//   1. every simulation here runs inside withSeededRandom(), which swaps
//      Math.random for a seeded PRNG and restores it afterwards. Given the
//      same params, computeLayout() returns the same coordinates forever.
//   2. the result is frozen to data/layout.json by the layout lab, and the
//      scenes render from those fixed positions. The simulation never runs
//      during the talk.
//
// Step 1 alone would very nearly do, but the frozen file is what the SPEC
// asks for and it also means the deck starts instantly.
//
// Everything is computed in 1920x1080 viewBox units.
// ============================================================================

import { STAGE } from './theme.js';
import { wrap2 } from './labels.js';
import { textWidth, ASCENT, DESCENT } from './textmetrics.js';

// --- deterministic randomness ----------------------------------------------

/** mulberry32 -- small, fast, good enough to break force ties reproducibly. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run fn with Math.random replaced by a seeded generator.
 * Restores the real Math.random even if fn throws -- leaving a seeded PRNG
 * installed globally would be a genuinely horrible bug to chase.
 */
export function withSeededRandom(seed, fn) {
  const real = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = real;
  }
}

// --- default parameters -----------------------------------------------------
// These are the layout lab's slider defaults and the starting guess for the
// frozen layout. Tuned by eye against the 49-respondent synthetic set; expect
// to move them once real data lands (SPEC build order step 8).

export const DEFAULTS = {
  seed: 20260826,

  // -- projection / map ----------------------------------------------------
  // Fraction of the stage the five labs fill before contraction.
  fitPadding: 0.13,
  // SPEC 6.2: pos_i = C + k * (c_i - C), k in [0.4, 0.6].
  k: 0.52,
  // SPEC 6.3: scale polygons up as they contract, so Rheingau (811 km2)
  // does not vanish next to the Hessian Low Mountain Range (3263 km2).
  // Contraction pulls the anchors together by k while this pushes the outlines
  // outward, so the two fight: past about 1.5 the East Brandenburg and
  // Havelland polygons visibly interpenetrate. The layout lab reports the
  // overlap; keep it at zero.
  polyScale: 1.35,

  // -- state-grouped anchors (alternative to the geographic layout) --------
  // 'geographic' | 'grouped'. See computeAnchors(). Scene 1 always renders
  // geographically regardless -- the abstraction has to be earned on screen.
  // GROUPED is the deck's layout. The five labs are very nearly collinear
  // (Rheingau -> Hessian LMR -> North Hesse -> Havelland -> East Brandenburg
  // runs SW to NE), and every theme position is a weighted centroid of the lab
  // anchors, so under `geographic` all sixteen themes are confined to the
  // labs' convex hull -- a thin diagonal band that leaves two corners of the
  // stage empty and crushes the labels together. Measured on the 49-respondent
  // set: theme spread 546x462 px grouped against 544x384 geographic, and mean
  // collision drift 11.6 px against 38.6 px.
  //
  // Scene 1 is unaffected and stays geographic whatever this says -- beat 1.2
  // is where the audience earns the abstraction by watching geography become
  // diagram, so the rows have to be earned on screen before they are used.
  anchorMode: 'grouped',
  groupTop: 0.30,        // first row's y, as a fraction of stage height
  groupRowGap: 0.34,     // vertical gap between state rows, same units
  groupColGap: 430,      // horizontal gap between labs within a row, px

  // -- the roster (scene 1) ------------------------------------------------
  // Scene 1 shows every respondent as a dot in a tidy grid on the left, under
  // an "n respondents" header, BEFORE any of them is placed. That way the dots
  // exist from the first slide and scene 2 is them flying to their lab rather
  // than 49 dots appearing out of nowhere -- object constancy from the very
  // start of the deck (SPEC 2.1).
  rosterX: 118,
  rosterY: 372,
  rosterCols: 7,
  rosterGap: 30,

  // -- lab anchors ---------------------------------------------------------
  // Scene 1: a small fixed anchor. Scene 2: sized by respondent count with the
  // count printed inside. Scene 3+: back to a uniform size with no number, so
  // the labs recede and the stage belongs to the themes (SPEC 6.4).
  //
  // Sized by RESPONDENTS, never by NUTS3 area -- SPEC 6.3's size caveat is
  // about a kreisfreie Stadt looking unimportant beside a rural Landkreis, and
  // cohort size is a different, legitimate quantity.
  labRadiusMin: 24,
  labRadiusMax: 46,
  labRadiusScene1: 9,
  labRadiusLate: 13,

  // -- respondents (scene 2) ----------------------------------------------
  respondentRadius: 4.5,       // SPEC 6.5: 4-5 px at 1920 wide
  respondentCollide: 7.0,
  respondentCharge: -26,
  labLinkDistance: 118,
  labLinkStrength: 0.55,
  // Keeps the cloud off the stage edges without a hard clamp.
  centreGravity: 0.012,

  // -- themes (scene 3) ---------------------------------------------------
  // SPEC 3: position is the weighted centroid of the theme's respondents'
  // labs, then a COLLISION PASS ONLY. positionStrength is how hard we hold
  // that explicit position; it is deliberately high.
  themePositionStrength: 0.85,
  // Scene 3 prints the respondent count INSIDE each theme node, so the
  // smallest node must still fit two digits at the 24 px text floor.
  themeRadiusMin: 18,
  themeRadiusMax: 40,
  themeCollidePad: 8,
  // Push themes outward from the crowded centre by this fraction of their
  // distance from C, so labels have somewhere to live. Swept against both
  // anchor modes: 1.5 keeps max collision drift under 70 px geographically
  // and under 30 px grouped, with nothing pushed off stage.
  themeSpread: 1.5,
  // A fixed ellipse instead of weighted centroids. Off by default so the
  // SPEC 3 arrangement stays the lab's reference; the deck turns it on so
  // every scene with this kind of node (3, 3.5, 4, 6) reads as one family
  // (review of 14 September 2026). Sixteen nodes up to themeRadiusMax need
  // the full stage width, like the stakeholder ellipse.
  themeRing: false,
  themeRingRx: 760,
  themeRingRy: 330,
  themeRingCentreY: 0.5,   // fraction of stage height
  themeRingRotate: -90,    // degrees; -90 puts th-0 at the top

  // -- node size, shared by scenes 3, 3.5, 4 and 6 -------------------------
  // Radius = max * (n / maxN) ^ exp, floored at the scene's min radius so the
  // count still fits inside. The SAME rule as the scene 4.5 cohort bubbles
  // (matrixBubbleExp), so size reads identically on every slide (review of
  // 16 September 2026). 0.5 would be area-proportional and too subtle to see
  // across a projected room; 0.85 deliberately overstates, and the count
  // printed inside or beside the node is the measured quantity.
  nodeRadiusExp: 0.85,

  // -- use cases (scene 4) ------------------------------------------------
  // `useCaseRadius` is the LARGEST node; the others scale down from it by the
  // number of researchers with experience.
  useCaseRadius: 46,
  useCaseRadiusMin: 22,
  useCaseCollidePad: 26,
  useCasePositionStrength: 0.8,
  useCaseSpread: 1.34,

  // RING, NOT WEIGHTED CENTROID -- and unlike scene 3 this is not a cosmetic
  // choice. Measured lab concentration for the six use cases is 0.04..0.19
  // (mean 0.10): every one of them is drawn near-evenly from all five labs, so
  // their weighted centroids land almost on top of each other and the
  // collision pass then flings them 150-220 px apart. The position you would
  // see is collision order, not data -- exactly the "central because
  // everywhere is indistinguishable from central because weak" trap in
  // SPEC 3, which bites harder here than it does for themes (whose
  // concentration reaches 0.60).
  //
  // So scene 4 states outright that the arrangement is for legibility and puts
  // the signal where it actually is: link weight (beats 4.2 -> 4.3) and the
  // called-out leader. Ring order is the survey's own use case order and never
  // changes, so beat 4.3's morph keeps full object constancy.
  useCaseRing: true,
  useCaseRingRadius: 300,
  useCaseRingCentreY: 0.45,   // fraction of stage height
  useCaseRingRotate: -90,     // degrees; -90 puts uc-0 at the top
  // Link stroke width per unit of experience/interest (0/1/2).
  weightScale: 1.5,

  // -- links (SPEC 6.5) ---------------------------------------------------
  linkOpacity: 0.12,
  arcCurvature: 0.28,          // curved arcs, not straight lines

  // -- beeswarm (scene 5) -------------------------------------------------
  swarmCollide: 6.2,
  swarmXStrength: 1.0,
  swarmYStrength: 0.09,
  swarmWidth: 0.66,            // fraction of stage width the axis spans
  swarmY: 0.60,                // vertical centre, fraction of stage height

  // -- scene 4.5, the bubble matrix ----------------------------------------
  matrixX: 636,
  matrixY: 262,
  matrixColW: 196,
  matrixRowH: 148,
  matrixBubbleMax: 64,
  // Bubble radius = max * (n / maxN) ^ exp.
  //
  // exp = 0.5 is the perceptually "correct" encoding (area proportional to n),
  // and at these cohort sizes it is too subtle to read: 7 and 19 come out as
  // radius 39 and 64, which look nearly alike across a wide grid. 0.85 pushes
  // radius toward linear so the cohorts separate visibly (7 -> 27, 19 -> 64).
  //
  // This DELIBERATELY over-states the difference, so the bubble is context
  // only -- the measured quantity is the countable dots inside it, never the
  // bubble area. Zero still maps to zero, so nothing is being hidden.
  matrixBubbleExp: 0.85,
  matrixDotR: 4.2,

  // -- scene transitions ---------------------------------------------------
  // The PowerPoint-morph effect: because every node is joined by a stable id
  // (SPEC 2.1), switching scenes is a tween on cx/cy rather than a redraw, and
  // the same fifty dots visibly travel to their new arrangement.
  morphMs: 1100,
  morphStagger: 6,       // ms per node index, so the cloud moves as a wave
  // Elements that merely LEAVE (theme nodes at the end of scene 3, use case
  // nodes at the end of scene 4) fade at this speed instead of morphMs. They
  // have nowhere to travel to, so holding them for a full 1.1 s just delays
  // the next scene.
  fadeMs: 260,
  // Scene changes are STAGED, not simultaneous. Leaving scene 2 the lab nodes
  // shrink and their numbers go first; only then do the theme nodes start
  // growing. Overlapping the two made the middle of the stage churn -- the
  // audience could not tell what was arriving and what was leaving.
  //
  // Doubles as the duration of the lab-node resize itself, so the shrink is
  // finished by the time the themes begin.
  stageDelayMs: 340,
  // Incoming links DRAW, from the participant outward, rather than fading up
  // at full length (SPEC beats 2.2, 3.2 and 4.2 all say "links draw in").
  // arc() puts the M command at the respondent, so the growth direction
  // encodes source -> target: the participant reaching out to the theme. That
  // direction is information, which is why entrances are drawn while exits
  // merely fade -- a fade has no direction and reveals no structure.
  linkGrowMs: 650,
  // Where in the target node's growth the links start, as a fraction of
  // morphMs. Strictly sequencing node-then-links puts scene 3 past two and a
  // half seconds, which is a long time for a presenter to stand in front of;
  // 0.6 starts the draw once the node is unambiguously there.
  //
  // Ignored on any transition where the respondent dots travel -- see the
  // linkGrowDelay note in lab.html. Those have to wait for the landing.
  linkGrowOverlap: 0.4,
  // Links to the SAME target draw together, and the targets go one after
  // another, so each theme is seen to recruit its own people rather than all
  // 145 lines blooming at once. A per-group delay would scale with the group
  // count -- sixteen themes at 60 ms each is a full second of stagger on top
  // of the draw -- so the groups are spread across a fixed WINDOW instead.
  // Five labs or sixteen themes, the stagger costs the same.
  linkStaggerWindow: 550,
  // A drawing line has to be VISIBLE to read as drawing, and at linkOpacity
  // 0.12 a 1.1 px hairline tip is under the threshold of notice -- the draw
  // was measurably running and still could not be seen. So the line draws
  // bright and settles to its SPEC §6.5 opacity once complete: the moving tip
  // is legible, the finished field is not louder than the spec allows.
  linkGrowOpacity: 0.35,
  linkSettleMs: 450,

  // -- iterations ---------------------------------------------------------
  // Fixed tick counts, not alphaMin convergence: identical work every run.
  ticksRespondents: 420,
  ticksThemes: 260,
  ticksUseCases: 200,
  ticksSwarm: 320,

  // -- presentation flags --------------------------------------------------
  // Not geometry, but decisions the deck has to carry, so they belong in the
  // frozen params rather than in the lab's transient `opts`: a checkbox state
  // that only lives in the browser is a setting nobody can ship.
  //
  // The legend names the five Living Labs; whether it also prints a
  // respondent count is OFF, and not only for tidiness. `lab.n` is
  // incremented once per MEMBERSHIP (model.js), so a bridging researcher is
  // counted in every lab they belong to and the five numbers sum to 61
  // against 49 people. A count that does not add up to the total on the
  // opening slide is worse than no count -- and scene 2 already prints each
  // cohort size inside its own node, where it is unambiguous.
  legendCounts: false,

  // Scene 4.5's second beat: one hollow ring per researcher who wants
  // experience of that use case and has none (survey Q8). The point of the
  // beat is the MISMATCH -- a bubble with one solid dot and eight hollow ones
  // is demand the lab cannot currently supply from within itself.
  matrixDemand: true,

  // -- stakeholder groups (scene 3.5) --------------------------------------
  // Fourteen groups, the same shape as the themes scene. Radius encodes
  // respondent count; position deliberately does not -- see layoutRing.
  //
  // Measured concentration is 0.02-0.17 against the themes' 0.60, so the ring
  // is the default here for the same reason it is the default in scene 4.
  // Set false to compare against the weighted-centroid arrangement.
  stakeholderRing: true,
  // An ELLIPSE, not a circle. Fourteen nodes on a circle wide enough to keep
  // them apart would not fit the stage height; this uses the 16:9 width that
  // scene 4's six-node circle leaves empty.
  stakeholderRingRx: 780,
  stakeholderRingRy: 400,
  stakeholderRingCentreY: 0.52,   // fraction of stage height
  stakeholderRingRotate: -90,     // degrees; -90 puts sg-0 at the top
  stakeholderRadiusMin: 18,
  stakeholderRadiusMax: 56,
  // Only used when stakeholderRing is false.
  stakeholderSpread: 1.5,
  stakeholderPositionStrength: 0.85,
  stakeholderCollidePad: 14,
  ticksStakeholders: 260,

  // -- monitoring pilot interest (scene 6) ---------------------------------
  // Five areas on a fixed ring, uniform radius. See the note at the call site
  // for why size is not an encoding here.
  // Largest node; sized by any-interest count like every other ring scene.
  monitoringRadius: 40,
  monitoringRadiusMin: 22,
  monitoringRingRx: 600,
  monitoringRingRy: 330,
  monitoringRingCentreY: 0.5,
  monitoringRingRotate: -90,

  // -- scene 6, monitoring bubbles (review of 16-17 September 2026) --------
  // Five bubbles in a row inside the theme ring, one dot per interested
  // participant, packed at constant density so bubble AREA is the head count.
  monRowY: 540,
  monRowX0: 530,
  monRowDX: 215,
  monPitch: 12.5,          // dot spacing inside a bubble
  monDotVery: 5.5,         // "very interested"
  monDotSome: 3.2,         // "somewhat interested"
  // Theme x topic lines (third press). Width is the HEAD COUNT: researchers
  // with the theme who are very interested in the topic (review of
  // 17 September 2026). Lift was tried first and hid Biodiversity -- the
  // largest group for four of five topics, but a theme held by over half the
  // sample can never sit far above the average. Pairs below monLinkMinN are
  // not drawn; the largest group per topic (ties included) is green.
  monLinkMinN: 6,

  // How many more respondents the top area needs before the scene is willing
  // to call it the leader. SPEC 4.5 is the reason this exists: on the current
  // data the top two differ by ONE respondent, and the "any interest" and
  // "very interested" rankings are almost inverses of each other -- Data
  // integration is second on one and last on the other. Ringing a winner
  // there would be inventing a finding. Below this margin the scene states
  // that nothing stands out, which is the actual result.
  monitoringLeadMargin: 4,

  // -- scene 7, the shared-data word cloud ---------------------------------
  // Five coding dimensions, then the tier-1 codes around each one. Both are
  // sized by unique responses, font size proportional to the SQUARE ROOT of
  // the count so a word's area -- not its height -- tracks the number.
  cloudDimMax: 118,        // px, the largest dimension
  cloudDimMin: 44,         // floor for the smallest dimension
  cloudTermMax: 50,        // px, the most-cited code
  cloudTermMin: 28,        // SPEC 7 type floor; most codes were cited once
  cloudTermWrap: 26,       // characters before a code breaks onto two lines
  // Cluster footprint = this x the ink area of its words. Sets how much room
  // a dimension is given on the first press for the codes of the second.
  cloudSlack: 2.3,
  cloudAspect: 1.9,        // clusters are wider than tall, like the words
  cloudGap: 12,            // clear space between two words of one dimension
  // ...and between words of DIFFERENT dimensions. Wider, so a channel of
  // paper separates the clusters and position groups the words, not only hue.
  cloudClusterGap: 40,
  // Clockwise from the left. Neighbours matter twice: related dimensions sit
  // together, and the two dark greens (Environment, Economic) do not touch.
  cloudOrder: 'environment,productivity,economic,social,transformation-capacity',
  cloudLeft: 70, cloudRight: 1850, cloudTop: 130, cloudBottom: 985,

  // -- scene 0.5, the recipients block --------------------------------------
  // 179 dots at 24 cols x 8 rows. Wide rather than square: a block that fills
  // the stage width reads as a population, where a tight square reads as a
  // table of something.
  // 179 dots at 13 x 14, on the LEFT. Taller than wide, because the survivors
  // collapse into the scene 1 roster (7 columns in the same left margin) and
  // a block shaped roughly like its own destination makes that a settling
  // rather than a journey across the stage.
  recipientCols: 13,
  recipientGap: 30,
  recipientCentreX: 0.22,  // fraction of stage width
  recipientTop: 0.20,      // fraction of stage height, top row of the block
  recipientDotR: 5,

  // The logo grid, on the RIGHT. Four per row rather than eight: sixteen
  // across one row gives each logo 120 px, which is not enough for a
  // wordmark, and 250 px is.
  logoCols: 4,
  logoBoxW: 250,
  logoBoxH: 62,
  logoGapX: 26,
  logoGapY: 44,
  logoCentreX: 0.68,       // fraction of stage width
  logoTop: 0.20,           // fraction of stage height

  // -- scene 5.2, the participation matrix ---------------------------------
  // Lab x participatory activity, the same bubbles as scene 4.5 (review of
  // 16 September 2026). Bubble radius reuses matrixBubbleMax / matrixBubbleExp
  // and the dot radius matrixDotR, so a cohort is the same size on both slides.
  partX: 277,          // left edge of the first column
  partY: 330,          // top of the first row band
  partColW: 250,
  partRowH: 136,
  // Gap between the four research-process activities and the two
  // dissemination / network activities.
  partGroupGap: 60,

  // -- scene 5.2 (old), the participation wall -----------------------------
  // 49 columns across 1480 px is a 30 px pitch, which at r=6 leaves each dot
  // its own cell with room to spare -- the whole point of transposing.
  spineX0: 380,
  spineWidth: 1480,
  spineDotR: 6,
  spineTop: 300,
  spineRowGap: 78,
  // The gap between the ladder rows and the mode rows. Not decoration: SPEC
  // 4.2 says the modes are lateral rather than higher rungs, and this gap is
  // the visual claim that these are two scales and not one.
  spineGroupGap: 46,
  // Row labels are right-aligned this far left of the first column.
  spineLabelGap: 36,
  // How far below the last row the contradiction marks sit.
  spineFilterGap: 56,
};

// ============================================================================
// projection
// ============================================================================

/**
 * Conic conformal fitted to the five labs. Conic conformal is the right family
 * for Germany's latitude -- Mercator would visibly stretch the 3 degrees of
 * latitude between Rheingau and East Brandenburg.
 */
export function makeProjection(model, params = DEFAULTS) {
  const [minX, minY, maxX, maxY] = model.labsBbox;

  // A MultiPoint, NOT a Polygon. d3-geo reads polygons spherically and uses
  // ring winding to decide which side is inside; a ring wound the wrong way
  // means "the whole sphere except this box", which makes fitExtent compute
  // near-infinite bounds and collapse scale to ~0. Every lab then projects to
  // the same pixel and the entire deck silently renders as one dot.
  // Points carry no winding, so this cannot happen.
  const fitTarget = {
    type: 'MultiPoint',
    coordinates: [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]],
  };

  const pad = params.fitPadding * Math.min(STAGE.w, STAGE.h);
  return d3.geoConicConformal()
    .parallels([49, 53])
    .rotate([-10.5, 0])
    .fitExtent(
      [[pad, pad], [STAGE.w - pad, STAGE.h - pad]],
      fitTarget
    );
}

// ============================================================================
// anchors and the contraction
// ============================================================================

/**
 * Where the five labs sit. Two modes; everything downstream (respondents,
 * themes, use cases, link geometry) follows from this one function.
 *
 * 'geographic' -- SPEC 6.2, uniform not eyeballed:
 *      pos_i = C + k * (c_i - C)
 *   with C the centroid of the five lab centroids. Preserves relative
 *   bearings, so north-west stays north-west.
 *
 * 'grouped' -- rows by federal state. The five labs are very nearly COLLINEAR
 *   (Rheingau -> Hessian LMR -> North Hesse -> Havelland -> East Brandenburg
 *   runs SW to NE), so under 'geographic' every theme position -- a weighted
 *   centroid of those anchors -- is confined to a thin diagonal band, leaving
 *   two corners of the stage empty. This mode trades exact bearings for the
 *   stage: Brandenburg on the top row, Hessen below, each row centred and
 *   spread west to east.
 *
 *   It still respects geography at the level that reads: rows are ordered
 *   north to south, and labs within a row west to east. What it gives up is
 *   the exact bearing between any two labs, which is why 'geographic' stays
 *   the default and scene 1 always uses it -- the audience earns the
 *   abstraction by watching beat 1.2 first.
 *
 * Both modes return trueX/trueY (the honest projected position), so the
 * polygon transforms and the beat 1.1 overview work identically in either.
 */
export function computeAnchors(model, projection, params = DEFAULTS) {
  const trues = model.labs.map(l => {
    const [x, y] = projection(l.centroid);
    return { id: l.id, x, y, lab: l };
  });

  const anchors = new Map();

  if (params.anchorMode === 'grouped') {
    // Rows come from geo.json already ordered north to south.
    const states = model.states.length
      ? model.states
      : [...new Set(model.labs.map(l => l.state))].map(c => ({ code: c, name: c }));

    const rows = states.map((st, i) => {
      const members = trues
        .filter(t => t.lab.state === st.code)
        .sort((a, b) => a.lab.centroid[0] - b.lab.centroid[0]);   // west -> east
      const y = STAGE.h * (params.groupTop + i * params.groupRowGap);
      const gap = params.groupColGap;
      const x0 = STAGE.w / 2 - ((members.length - 1) * gap) / 2;

      members.forEach((t, j) => {
        anchors.set(t.id, {
          id: t.id,
          trueX: t.x, trueY: t.y,
          x: x0 + j * gap,
          y,
        });
      });

      return {
        code: st.code, name: st.name, y,
        x0, x1: x0 + (members.length - 1) * gap,
        labIds: members.map(t => t.id),
      };
    }).filter(r => r.labIds.length);

    const C = centroidOf([...anchors.values()]);
    return { anchors, C, rows };
  }

  // --- geographic (default) ------------------------------------------------
  const C = centroidOf(trues);
  const k = params.k;
  for (const t of trues) {
    anchors.set(t.id, {
      id: t.id,
      trueX: t.x,
      trueY: t.y,
      x: C.x + k * (t.x - C.x),
      y: C.y + k * (t.y - C.y),
    });
  }
  return { anchors, C, rows: [] };
}

function centroidOf(pts) {
  return {
    x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
    y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
  };
}

/**
 * The per-lab SVG transform for beat 1.2: slide the polygon to its contracted
 * anchor while scaling it about its own centroid.
 *
 * Returned as a transform string rather than re-projected geometry so beat 1.2
 * is a single attribute tween on an element that already exists -- object
 * constancy is preserved and the audience watches geography become diagram
 * (which is the whole point of the beat).
 */
export function polyTransform(anchor, polyScale) {
  const dx = anchor.x - anchor.trueX;
  const dy = anchor.y - anchor.trueY;
  const { trueX: cx, trueY: cy } = anchor;
  return `translate(${r2(dx)},${r2(dy)}) ` +
         `translate(${r2(cx)},${r2(cy)}) scale(${r3(polyScale)}) ` +
         `translate(${r2(-cx)},${r2(-cy)})`;
}

// ============================================================================
// the main entry point
// ============================================================================

/**
 * Compute every position the deck needs, deterministically.
 * Returns the object that gets frozen to data/layout.json.
 */
export function computeLayout(model, overrides = {}) {
  const params = { ...DEFAULTS, ...overrides };
  const projection = makeProjection(model, params);
  const { anchors, C, rows } = computeAnchors(model, projection, params);
  const path = d3.geoPath(projection);

  // SCENE 1 IS ALWAYS GEOGRAPHIC.
  // Beat 1.1 shows the polygons at their true position and beat 1.2 contracts
  // them; neither means anything on a state-grouped diagram. So the geographic
  // anchors are computed unconditionally, alongside whichever mode the rest of
  // the deck uses. Having both position sets in one layout file is also what
  // makes the scene 1 -> 2 morph possible: the polygons and anchors tween from
  // one to the other instead of cutting.
  const geoAnchors = params.anchorMode === 'geographic'
    ? anchors
    : computeAnchors(model, projection,
                     { ...params, anchorMode: 'geographic' }).anchors;

  return withSeededRandom(params.seed, () => {
    const respondents = layoutRespondents(model, anchors, params);
    const themes = params.themeRing
      ? layoutRing(model.themes, {
          cx: STAGE.w / 2,
          cy: STAGE.h * params.themeRingCentreY,
          rx: params.themeRingRx,
          ry: params.themeRingRy,
          radius: themeRadius(model, params),
          rotateDeg: params.themeRingRotate,
        })
      : layoutSatellites(
          model.themes, model, anchors, C, params,
          themeRadius(model, params),
          params.themeSpread, params.themePositionStrength,
          params.themeCollidePad, params.ticksThemes,
        );
    const useCases = params.useCaseRing
      ? layoutUseCaseRing(model, params)
      : layoutSatellites(
          model.useCases, model, anchors, C, params,
          useCaseRadius(model, params),
          params.useCaseSpread, params.useCasePositionStrength,
          params.useCaseCollidePad, params.ticksUseCases,
        );
    // Scene 3.5. A ring by default, for the reason recorded on layoutRing:
    // measured stakeholder concentration is 0.02-0.17, so every group is drawn
    // near-equally from all five labs and a weighted centroid would be
    // collision order pretending to be data. The centroid path is kept so the
    // two can be compared in the lab.
    const stakeholders = model.stakeholders.length === 0 ? {}
      : params.stakeholderRing
        ? layoutRing(model.stakeholders, {
            cx: STAGE.w / 2,
            cy: STAGE.h * params.stakeholderRingCentreY,
            rx: params.stakeholderRingRx,
            ry: params.stakeholderRingRy,
            radius: stakeholderRadius(model, params),
            rotateDeg: params.stakeholderRingRotate,
          })
        : layoutSatellites(
            model.stakeholders, model, anchors, C, params,
            stakeholderRadius(model, params),
            params.stakeholderSpread, params.stakeholderPositionStrength,
            params.stakeholderCollidePad, params.ticksStakeholders,
          );
    // Scene 6. A ring, since concentration is 0.02-0.05 and position carries
    // nothing. Radius was uniform on purpose (a seven-person spread rendered
    // as area looked like a finding); the review of 16 September 2026 asked
    // for every node scene to size by count, so it now does, and the counts
    // stay in the label so the small spread can be read, not estimated.
    const monitoring = (model.monitoring ?? []).length === 0 ? {}
      : layoutRing(model.monitoring, {
          cx: STAGE.w / 2,
          cy: STAGE.h * params.monitoringRingCentreY,
          rx: params.monitoringRingRx,
          ry: params.monitoringRingRy,
          radius: monitoringRadius(model, params),
          rotateDeg: params.monitoringRingRotate,
        });
    const recipients = layoutRecipients(model, params);
    const spine = layoutSpine(model, params);
    const swarm = layoutSwarm(model, params);
    const matrix = layoutMatrix(model, params);
    const monBubbles = layoutMonitoringBubbles(model, params);
    const part = layoutParticipation(model, params);
    const roster = layoutRoster(model, params);
    const cloud = layoutWordCloud(model, params);

    return {
      cloud,
      part,
      monBubbles,
      meta: {
        // The LAYOUT's own format version, not the data's. 1.1 adds the
        // `stakeholders` block and `stakeholderLayout` for scene 3.5.
        schema_version: '1.1',
        // Which data schema these coordinates were cut from. Separate from the
        // line above on purpose: the layout format and the data contract move
        // independently, and conflating them makes one of the two versions a
        // lie. A mismatch here means the layout is stale.
        data_schema: model.meta?.schema ?? null,
        // Provenance: which data produced these coordinates. If this does not
        // match the data.json you are shipping, the layout is stale.
        n_respondents: model.respondents.length,
        branch: model.branch.id,
        stage: { ...STAGE },
        note: 'Frozen layout. Regenerate with lab.html, never at runtime.',
      },
      params,
      contractionCentre: { x: r2(C.x), y: r2(C.y) },
      anchorMode: params.anchorMode,
      // Populated only in 'grouped' mode: one entry per federal state row,
      // for the row labels that make the abstraction explicit on screen.
      stateRows: rows.map(r => ({
        code: r.code, name: r.name,
        y: r2(r.y), x0: r2(r.x0), x1: r2(r.x1), labIds: r.labIds,
      })),
      labs: Object.fromEntries(model.labs.map(l => {
        const a = anchors.get(l.id);
        return [l.id, {
          x: r2(a.x), y: r2(a.y),
          trueX: r2(a.trueX), trueY: r2(a.trueY),
          transform: polyTransform(a, params.polyScale),
          n: l.n,
          // Scene 2 radius, from the cohort size.
          r: r2(labRadius(model, params)(l.n)),
        }];
      })),
      // Lab anchors for scene 1, always geographic. Scenes 2+ use `labs`.
      labsGeographic: Object.fromEntries(model.labs.map(l => {
        const a = geoAnchors.get(l.id);
        return [l.id, {
          x: r2(a.x), y: r2(a.y),
          trueX: r2(a.trueX), trueY: r2(a.trueY),
          transform: polyTransform(a, params.polyScale),
          n: l.n,
          // Same value as in `labs`: the cohort radius is a property of how
          // many people are in the lab, not of which anchor mode is in use.
          // Kept here so the two entries stay structurally identical and can
          // be compared directly.
          r: r2(labRadius(model, params)(l.n)),
        }];
      })),

      respondents, themes, stakeholders, useCases, monitoring,
      recipients, spine, swarm, matrix, roster,
      // Voronoi-style cells for the highlighted theme / stakeholder nodes:
      // which labs each node's respondents come from. Unit radius, so the
      // stage scales them to the node. See nodeCells().
      themeCells: nodeCells(model.themes, 'themeIds', model, anchors),
      stakeholderCells: nodeCells(model.stakeholders, 'stakeholderIds',
        model, anchors),
      themeLayout: params.themeRing ? 'ring' : 'weighted-centroid',
      // How scene 3.5 was arranged, so the scene can caption itself honestly
      // exactly as scene 4 does.
      stakeholderLayout: params.stakeholderRing ? 'ring' : 'weighted-centroid',
      // How scene 4 was arranged, so the scene can caption itself honestly.
      useCaseLayout: params.useCaseRing ? 'ring' : 'weighted-centroid',

      // BEAT 1.1 -- the overview.
      // SPEC 6.1 pins the projection to the bounding box of the five labs, so
      // at identity the Germany outline is mostly off stage. Rather than
      // introduce a second projection (which would be a real coordinate
      // conflict), beat 1.1 applies this single group transform to the map
      // layers: it zooms out so the whole country fits, with the labs at true
      // position inside it. Beat 1.2 tweens that group back to identity while
      // the per-lab contraction transforms run. The audience watches geography
      // become diagram, which is exactly what the beat is for.
      overview: overviewTransform(model, path),

      // Projected bounding box per lab, so the layout lab can report whether
      // the polygon scale-up has pushed neighbours into each other.
      labBounds: Object.fromEntries(
        model.labs.map(l => [l.id, path.bounds(l.feature).flat().map(r2)])),
      // Projected path strings, so index.html needs no projection code at all
      // and the scenes stay pure rendering.
      paths: {
        germany: path(model.germany),
        labs: Object.fromEntries(
          model.labs.map(l => [l.id, path(l.feature)])),
        nuts3: Object.fromEntries(
          model.nuts3.features.map(f => [f.properties.nuts3, path(f)])),
      },
    };
  });
}

/**
 * The group transform that makes the whole Germany outline fit the stage under
 * a projection that was fitted to the five labs. Used by beat 1.1 and by the
 * layout lab's "true position" toggle.
 */
function overviewTransform(model, path, pad = 60) {
  const [[x0, y0], [x1, y1]] = path.bounds(model.germany);
  const s = Math.min((STAGE.w - 2 * pad) / (x1 - x0),
                     (STAGE.h - 2 * pad) / (y1 - y0));
  // scale about the origin, then centre the scaled bbox on the stage
  const tx = STAGE.w / 2 - s * (x0 + x1) / 2;
  const ty = STAGE.h / 2 - s * (y0 + y1) / 2;
  return {
    scale: r3(s),
    x: r2(tx),
    y: r2(ty),
    transform: `translate(${r2(tx)},${r2(ty)}) scale(${r3(s)})`,
  };
}

// ============================================================================
// scene 2 -- respondents settle near their lab, then freeze forever
// ============================================================================

function layoutRespondents(model, anchors, params) {
  // Fixed lab nodes plus free respondent nodes, in one simulation.
  const labNodes = model.labs.map(l => {
    const a = anchors.get(l.id);
    return { id: l.id, fx: a.x, fy: a.y, isLab: true };
  });

  // Seed each respondent near their primary lab -- or at the contraction
  // centre for the unaffiliated -- so the sim converges fast and, more
  // importantly, converges to the same basin every time.
  const centre = { x: STAGE.w / 2, y: STAGE.h / 2 };
  const nodes = model.respondents.map((r, i) => {
    const a = r.primaryLab ? anchors.get(r.primaryLab) : null;
    // deterministic ring offset, no randomness at all
    const ang = (i * 2.399963229728653);          // golden angle
    const rad = 34 + 14 * Math.sqrt(i % 11);
    return {
      id: r.id,
      x: (a ? a.x : centre.x) + Math.cos(ang) * rad,
      y: (a ? a.y : centre.y) + Math.sin(ang) * rad,
      isLab: false,
      unplaced: r.unplaced,
    };
  });

  const all = [...labNodes, ...nodes];
  const byId = new Map(all.map(n => [n.id, n]));
  const links = model.links.respondentLab.map(l => ({
    source: byId.get(l.source), target: byId.get(l.target),
  }));

  const sim = d3.forceSimulation(all)
    .force('link', d3.forceLink(links)
      .distance(params.labLinkDistance)
      .strength(params.labLinkStrength))
    .force('charge', d3.forceManyBody().strength(params.respondentCharge))
    .force('collide', d3.forceCollide(params.respondentCollide))
    // Unaffiliated respondents have no link at all, so without a gravity term
    // they drift off stage. SPEC open decision 4 -- see lab.html for the
    // visual treatment; this only keeps them on screen.
    .force('x', d3.forceX(centre.x).strength(params.centreGravity))
    .force('y', d3.forceY(centre.y).strength(params.centreGravity))
    .stop();

  for (let i = 0; i < params.ticksRespondents; i++) sim.tick();

  // SPEC scene 2: "At the end of this scene, freeze every respondent
  // position. They must not move again in scenes 3 or 4." That freeze is
  // exactly what writing these numbers to layout.json accomplishes.
  return Object.fromEntries(
    nodes.map(n => [n.id, { x: r2(n.x), y: r2(n.y) }]));
}

// ============================================================================
// scenes 3 and 4 -- explicit positions, collision pass only
// ============================================================================

// Same sqrt scale as themes: radius encodes respondent count, so the reading
// "how many of us work with this group" survives a layout that deliberately
// carries no positional signal.
//
// Scaled from ZERO, not from the min radius: a sqrt scale whose range started
// at the minimum squeezed 6..29 respondents into radius 39..60, and every
// theme looked the same size. The minimum is only a floor, so the smallest
// nodes can still hold their count.
function countRadius(items, nOf, rMin, rMax, exp) {
  const maxN = Math.max(1, ...items.map(nOf));
  return it => Math.max(rMin,
    rMax * Math.pow(Math.max(0, nOf(it)) / maxN, exp));
}

function stakeholderRadius(model, params) {
  return countRadius(model.stakeholders, t => t.n,
    params.stakeholderRadiusMin, params.stakeholderRadiusMax,
    params.nodeRadiusExp);
}

function themeRadius(model, params) {
  return countRadius(model.themes, t => t.n,
    params.themeRadiusMin, params.themeRadiusMax, params.nodeRadiusExp);
}

// Scene 4 is the experience slide, so size is researchers WITH experience.
function useCaseRadius(model, params) {
  return countRadius(model.useCases, u => u.nExperienced,
    params.useCaseRadiusMin, params.useCaseRadius, params.nodeRadiusExp);
}

function monitoringRadius(model, params) {
  return countRadius(model.monitoring ?? [], t => t.n,
    params.monitoringRadiusMin, params.monitoringRadius,
    params.nodeRadiusExp);
}

/**
 * SPEC section 3, stated on screen during the talk:
 *   "position = weighted centroid of its respondents' labs"
 * then a collision pass ONLY. No link forces, no charge -- those would make
 * the position emergent, and an evenly-spread theme would land dead centre
 * looking identical to a theme with no signal.
 *
 * The spread factor pushes nodes radially away from the contraction centre,
 * which relieves the centre crush without changing any node's BEARING -- so
 * the weighted-centroid claim on screen stays true.
 */
function layoutSatellites(items, model, anchors, C, params,
                          radiusOf, spread, strength, collidePad, ticks) {
  const centre = { x: STAGE.w / 2, y: STAGE.h / 2 };

  const targets = items.map((it, i) => {
    let wx = 0, wy = 0, wsum = 0;
    for (const [labId, w] of Object.entries(it.weights || {})) {
      if (!w) continue;
      const a = anchors.get(labId);
      if (!a) continue;
      wx += a.x * w; wy += a.y * w; wsum += w;
    }
    let tx, ty;
    if (wsum > 0) {
      tx = wx / wsum; ty = wy / wsum;
      // radial spread about C
      tx = C.x + (tx - C.x) * spread;
      ty = C.y + (ty - C.y) * spread;
    } else {
      // No lab-affiliated respondent holds this item. Park it on a
      // deterministic ring around the centre rather than stacking every such
      // node on one pixel.
      const ang = (i / Math.max(1, items.length)) * Math.PI * 2;
      tx = centre.x + Math.cos(ang) * 300;
      ty = centre.y + Math.sin(ang) * 300;
    }
    return { tx, ty };
  });

  const nodes = items.map((it, i) => ({
    id: it.id,
    r: radiusOf(it),
    x: targets[i].tx,
    y: targets[i].ty,
    tx: targets[i].tx,
    ty: targets[i].ty,
  }));

  const sim = d3.forceSimulation(nodes)
    .force('x', d3.forceX(d => d.tx).strength(strength))
    .force('y', d3.forceY(d => d.ty).strength(strength))
    .force('collide', d3.forceCollide(d => d.r + collidePad))
    .stop();

  // Tick count is passed in. It used to be chosen by testing
  // `items === model.themes`, which silently gave any third caller the use
  // case count -- and a different number of ticks is a different layout, so
  // the bug would have been a quiet change in geometry rather than an error.
  for (let i = 0; i < ticks; i++) sim.tick();

  return Object.fromEntries(nodes.map(n => [n.id, {
    x: r2(n.x), y: r2(n.y), r: r2(n.r),
    // How far the collision pass had to move it off the true weighted
    // centroid. If this gets large the claim on screen is no longer honest
    // and the spread/collide parameters need revisiting.
    drift: r2(Math.hypot(n.x - n.tx, n.y - n.ty)),
  }]));
}

/**
 * Six use cases on an evenly-spaced ring, in the survey's own order.
 *
 * No simulation and no collision pass: the positions are closed-form, so they
 * are trivially deterministic and, more importantly, they are HONEST about
 * carrying no information. `drift` is reported as 0 because there is no
 * weighted centroid being approximated -- nothing has been moved off anything.
 */
// A fixed, evenly-spaced ring. Used wherever the measured lab concentration
// is too low for a weighted centroid to mean anything: with every item drawn
// near-equally from all five labs the centroids land on top of each other and
// the collision pass then decides the picture, so position on screen would be
// collision order dressed up as data. A ring says "position is not the
// message" honestly, and leaves the signal in node size and link weight.
//
// Generalised over the item list so scene 3.5 (stakeholder groups) and scene 4
// (use cases) share one implementation and one set of guarantees.
// `rx`/`ry` may differ: the stage is 16:9, and a circle wide enough to space
// fourteen nodes apart would run off the top and bottom while leaving 600 px
// of width unused on either side. An ellipse is still a fixed, evenly-angled
// arrangement -- the honesty claim is unchanged -- it just uses the stage.
function layoutRing(items, { cx, cy, rx, ry, radius, rotateDeg }) {
  const n = items.length;
  const rot = (rotateDeg * Math.PI) / 180;

  return Object.fromEntries(items.map((it, i) => {
    const ang = rot + (i / n) * Math.PI * 2;
    return [it.id, {
      x: r2(cx + Math.cos(ang) * rx),
      y: r2(cy + Math.sin(ang) * ry),
      r: r2(typeof radius === 'function' ? radius(it) : radius),
      drift: 0,
      // Which way is "outward" from the ring centre, so a scene can push the
      // label away from the middle instead of into its neighbour.
      ox: r3(Math.cos(ang)),
      oy: r3(Math.sin(ang)),
    }];
  }));
}

function layoutUseCaseRing(model, params) {
  return layoutRing(model.useCases, {
    cx: STAGE.w / 2,
    cy: STAGE.h * params.useCaseRingCentreY,
    // Scene 4 stays a true circle: six nodes fit one comfortably, and the
    // measured 300 px closest pair is what leaves room for its label blocks.
    rx: params.useCaseRingRadius,
    ry: params.useCaseRingRadius,
    radius: useCaseRadius(model, params),
    rotateDeg: params.useCaseRingRotate,
  });
}

/** Scene 2 lab-node radius from cohort size. Area-proportional (sqrt). */
function labRadius(model, params) {
  const maxN = Math.max(1, ...model.labs.map(l => l.n));
  const s = d3.scaleSqrt()
    .domain([0, maxN])
    .range([0, params.labRadiusMax]);
  // Floor it, so the smallest cohort still fits two digits inside.
  return n => Math.max(params.labRadiusMin, s(n));
}

// ============================================================================
// scene 1 -- the roster
// ============================================================================

/**
 * Every respondent as a dot in a tidy grid, before anyone is placed.
 *
 * Ordered by LAB (lab-0..lab-4, unaffiliated last) and then by id. Two reasons:
 * the grid then shows the cohort's composition as colour blocks rather than
 * confetti, and when scene 2 begins each block flies to one destination, which
 * reads as five groups finding their place instead of 49 independent errands.
 *
 * Deterministic: pure function of the respondent list.
 */
function layoutRoster(model, params) {
  const order = new Map(model.labs.map((l, i) => [l.id, i]));
  const sorted = model.respondents.slice().sort((a, b) => {
    const ai = a.primaryLab ? order.get(a.primaryLab) : 99;
    const bi = b.primaryLab ? order.get(b.primaryLab) : 99;
    return ai - bi || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });

  const { rosterX: x0, rosterY: y0, rosterCols: cols, rosterGap: gap } = params;
  const positions = Object.fromEntries(sorted.map((r, i) => [r.id, {
    x: r2(x0 + (i % cols) * gap),
    y: r2(y0 + Math.floor(i / cols) * gap),
  }]));

  const rows = Math.ceil(sorted.length / cols);
  return {
    positions,
    n: sorted.length,
    header: { x: r2(x0 - gap / 2), y: r2(y0 - 44) },
    box: {
      x0: r2(x0 - gap / 2), y0: r2(y0 - gap / 2),
      x1: r2(x0 + (cols - 1) * gap + gap / 2),
      y1: r2(y0 + (rows - 1) * gap + gap / 2),
    },
  };
}

// ============================================================================
// scene 4.5 -- the bubble matrix
// ============================================================================

/**
 * Lab x use case, as bubbles of dots.
 *
 * Positions live here rather than in the renderer for one specific reason: the
 * 191 dots have to morph out of the scene 4 network and into the scene 5
 * beeswarm as the SAME DOM elements, which means every dot needs a stable key
 * and a position known before the transition starts. A renderer that placed
 * them on the fly could not do that.
 *
 * Dot keys are `labId|useCaseId|respondentId`. The lab is part of the key
 * because a bridging researcher legitimately appears in more than one row.
 */
// ============================================================================
// scene 0.5 -- who the survey was sent to
// ============================================================================
// One block of `invitedTotal` slots. The respondents occupy a subset of those
// slots and the rest are anonymous; beat two drops the anonymous ones and the
// respondents stay exactly where they were.
//
// THE SLOT ASSIGNMENT IS THE WHOLE TRICK. The 49 survivors are the same DOM
// circles that fly to the scene 1 roster and on into their Living Lab, so they
// have to be real respondents here, at real positions, from the first frame --
// "nothing appears from nowhere" starts one scene earlier than it used to.
//
// They are spread through the block by a deterministic stride rather than
// filling the first 49 slots, because a contiguous corner would read as "the
// people at the top answered" -- a pattern in the data where there is none.
// The stride is strictly increasing (179/49 > 1), so no two respondents can
// land in the same slot; asserted in the tests anyway.
//
// Nothing here is a force simulation, so the whole thing is closed-form and
// drift is zero by construction.
function layoutRecipients(model, params) {
  const R = model.recipients;
  if (!R) return null;

  const total = R.invitedTotal;
  const cols = Math.max(1, Math.round(params.recipientCols));
  const rows = Math.ceil(total / cols);
  const gap = params.recipientGap;

  // LEFT half of the stage. The block and the logo grid sit side by side
  // rather than stacked, which leaves the block room to be tall enough that
  // 179 dots read as a crowd, and puts the logos where they are a caption to
  // the whole thing rather than a header above one part of it.
  const blockW = (cols - 1) * gap;
  const x0 = STAGE.w * params.recipientCentreX - blockW / 2;
  const y0 = STAGE.h * params.recipientTop;

  const slotAt = i => ({
    x: r2(x0 + (i % cols) * gap),
    y: r2(y0 + Math.floor(i / cols) * gap),
  });

  // Respondents in id order -- no meaning implied, just reproducibility.
  const ids = model.respondents.map(r => r.id).slice().sort();
  const n = ids.length;
  const step = n ? total / n : 0;

  const responses = {};
  const taken = new Set();
  ids.forEach((id, k) => {
    let slot = Math.min(total - 1, Math.round(k * step));
    // Belt and braces: if rounding ever collides, walk forward.
    while (taken.has(slot) && slot < total - 1) slot += 1;
    taken.add(slot);
    responses[id] = { ...slotAt(slot), slot };
  });

  // Everyone else, anonymous. Indexed by slot so the key is stable across
  // renders and a dot never swaps places with another.
  const extra = [];
  for (let i = 0; i < total; i++) {
    if (taken.has(i)) continue;
    extra.push({ i, ...slotAt(i) });
  }

  // --- the logo grid ------------------------------------------------------
  // Decoupled from the dots on purpose: it says who was asked, and carries no
  // counts at all. Wraps to as many rows as the institution count needs.
  const boxes = [];
  const lc = Math.max(1, Math.round(params.logoCols));
  const lw = params.logoBoxW, lh = params.logoBoxH;
  const lgx = params.logoGapX, lgy = params.logoGapY;
  const lrows = Math.ceil(R.institutions.length / lc);
  const gridW = lc * lw + (lc - 1) * lgx;
  const lx0 = STAGE.w * params.logoCentreX - gridW / 2;
  const ly0 = STAGE.h * params.logoTop;
  R.institutions.forEach((inst, j) => {
    const col = j % lc, row = Math.floor(j / lc);
    boxes.push({
      slug: inst.slug,
      x: r2(lx0 + col * (lw + lgx)),
      y: r2(ly0 + row * (lh + lgy)),
      w: r2(lw), h: r2(lh),
    });
  });

  return {
    total, cols, rows, gap,
    dotR: params.recipientDotR,
    responses, extra,
    logos: boxes,
    logoRows: lrows,
    // Emitted so the renderer can centre the grid's own heading over it
    // without re-deriving the arithmetic.
    logoGrid: {
      x0: r2(lx0), y0: r2(ly0),
      x1: r2(lx0 + gridW), y1: r2(ly0 + lrows * lh + (lrows - 1) * lgy),
    },
    block: {
      x0: r2(x0), y0: r2(y0),
      x1: r2(x0 + blockW), y1: r2(y0 + (rows - 1) * gap),
    },
  };
}

function layoutMatrix(model, params) {
  const { matrixX: x0, matrixY: y0, matrixColW: cw, matrixRowH: ch } = params;
  const rDot = params.matrixDotR;

  const maxN = Math.max(1, ...model.labs.map(l => l.n));
  const rOf = n => params.matrixBubbleMax
    * Math.pow(Math.max(0, n) / maxN, params.matrixBubbleExp);

  const cells = {};
  const dots = {};
  const rows = [];

  model.labs.forEach((l, i) => {
    const cy = y0 + i * ch + ch / 2;
    const R = rOf(l.n);
    rows.push({ labId: l.id, y: r2(cy), r: r2(R), n: l.n });

    const row = model.matrix.find(m => m.labId === l.id);
    row.cells.forEach((c, j) => {
      const cx = x0 + j * cw + cw / 2;
      cells[`${l.id}|${c.useCaseId}`] = {
        x: r2(cx), y: r2(cy), r: r2(R),
        n: c.n, nExperienced: c.nExperienced, nDemand: c.nDemand,
        isVoid: c.isVoid,
      };

      // Experience dots and unmet-demand dots are packed in ONE call, so the
      // phyllotaxis stays at constant density across both populations -- the
      // property the whole cell comparison rests on (README: scaling the
      // spacing to fill the bubble would make every cell look equally full).
      // Experience first, so the solid core sits centrally and the hollow
      // demand rings fan out around it: a bubble that is mostly hollow reads
      // as appetite without capacity from across the room.
      const ids = [
        ...c.expIds.map(rid => ({ rid, role: 'exp' })),
        ...c.demandIds.map(rid => ({ rid, role: 'demand' })),
      ];
      // Dots are packed inside the bubble, leaving the dot's own radius plus a
      // hair of margin so none of them straddles the outline.
      const pts = packDots(ids.length, R - rDot - 2, rDot);
      ids.forEach(({ rid, role }, k) => {
        dots[`${l.id}|${c.useCaseId}|${rid}`] = {
          x: r2(cx + pts[k].x), y: r2(cy + pts[k].y),
          lab: l.id, useCase: c.useCaseId, respondent: rid, role,
        };
      });
    });
  });

  return {
    cells, dots, rows,
    cols: model.useCases.map((u, j) => ({
      useCaseId: u.id, x: r2(x0 + j * cw + cw / 2),
    })),
    dotR: rDot,
    headerY: r2(y0 - 46),
    labelX: r2(x0 - 34),
  };
}

// ============================================================================
// scene 6 -- monitoring bubbles
// ============================================================================

// Row order, social end to biophysical end: that is where the strong theme
// lines pull, so fewer of them cross the row. Unknown keys go last.
export const MONITORING_ROW_ORDER = ['farmer_panel', 'farmer_apps',
  'secondary_integration', 'sampling_design', 'cross_scale_validation'];

/**
 * Scene 6 (review of 16-17 September 2026). Each monitoring topic is a bubble
 * holding one dot per participant interested in it -- "very" dots larger and
 * packed first so they form the core, "somewhat" around them. The same move
 * as the experience matrix: dots fly in from where the people last were.
 *
 * `links` are the third press: theme x topic pairs, sized by how many of the
 * theme's researchers are very interested in the topic. "Very" is the top of
 * the scale, the same rule as model.js's nVery.
 */
function layoutMonitoringBubbles(model, params) {
  const topics = [...(model.monitoring ?? [])];
  if (!topics.length) return null;
  const rank = t => {
    const i = MONITORING_ROW_ORDER.indexOf(t.key);
    return i < 0 ? MONITORING_ROW_ORDER.length : i;
  };
  topics.sort((a, b) => rank(a) - rank(b));
  const level = (r, t) => r.monitoring?.[t.key] ?? 0;
  const VERY = 2;
  const golden = Math.PI * (3 - Math.sqrt(5));

  const bubbles = {}, dots = {};
  topics.forEach((t, i) => {
    const very = model.respondents.filter(r => level(r, t) >= VERY);
    const some = model.respondents.filter(r =>
      level(r, t) > 0 && level(r, t) < VERY);
    const n = very.length + some.length;
    const x = params.monRowX0 + i * params.monRowDX, y = params.monRowY;
    bubbles[t.id] = { x: r2(x), y: r2(y),
      r: r2(params.monPitch * Math.sqrt(n) + 10),
      n, nVery: very.length, key: t.key, order: i };
    [...very.map(r => [r, true]), ...some.map(r => [r, false])]
      .forEach(([r, isVery], k) => {
        const rad = params.monPitch * Math.sqrt(k + 0.5);
        dots[`${t.id}|${r.id}`] = {
          x: r2(x + rad * Math.cos(k * golden)),
          y: r2(y + rad * Math.sin(k * golden)),
          topic: t.id, respondent: r.id, very: isVery,
        };
      });
  });

  const N = model.respondents.length;
  const links = [];
  for (const th of model.themes) {
    const holders = model.respondents.filter(r => r.themeIds.includes(th.id));
    for (const t of topics) {
      const both = holders.filter(r => level(r, t) >= VERY).length;
      const base = bubbles[t.id].nVery / N;
      const lift = holders.length && base ? both / holders.length / base : 0;
      if (both < params.monLinkMinN) continue;
      // Lift kept for the record (lab diagnostics, tests), not drawn.
      links.push({ theme: th.id, topic: t.id, both, lift: r2(lift),
        strong: false });
    }
  }
  // The largest group per topic, ties included.
  for (const t of topics) {
    const mine = links.filter(l => l.topic === t.id);
    const top = Math.max(0, ...mine.map(l => l.both));
    for (const l of mine) l.strong = l.both === top;
  }
  // Green painted last, on top; thicker over thinner.
  links.sort((a, b) => (a.strong - b.strong) || (a.both - b.both));

  return { bubbles, dots, links,
    dotVery: params.monDotVery, dotSome: params.monDotSome };
}

// ============================================================================
// scene 7 -- the shared-data word cloud
// ============================================================================

/**
 * Two presses over one set of positions: the five coding dimensions alone,
 * then every tier-1 code (WordCloud = yes) packed around its own dimension.
 *
 * The dimensions are placed for the SECOND press. Each gets a footprint in
 * proportion to the ink area of the codes that will arrive around it, so on
 * the first press a dimension with eleven codes to come already sits in room
 * for eleven, and nothing moves when they arrive.
 *
 *   1. footprint per dimension: area cloudSlack x (ink of its words)
 *   2. pack the footprints: pairwise push-apart plus a pull to the centre, in
 *      a space stretched by cloudAspect so the wide ellipses are circles
 *   3. every code walks an elliptical spiral out from its dimension and takes
 *      the first spot that overlaps no word and lies in its OWN territory --
 *      nearer (power distance) its dimension than any other -- so clusters
 *      stay separable by position as well as by colour
 *   4. the finished cloud is centred on the free stage
 *
 * No randomness and fixed iteration counts: deterministic by construction.
 * Boxes are INK boxes from textmetrics.js (ascender to descender), which is
 * what two words must not share.
 */
function layoutWordCloud(model, params) {
  const W = model.wordcloud;
  if (!W) return null;
  const P = params;
  const order = String(P.cloudOrder).split(',').map(x => x.trim());
  const rank = d => { const i = order.indexOf(d.id); return i < 0 ? 99 : i; };
  const dims = [...W.dimensions].sort((a, b) => rank(a) - rank(b));
  const maxDim = Math.max(...dims.map(d => d.n));
  const maxTerm = Math.max(1, ...dims.flatMap(d => d.terms.map(t => t.n)));

  const word = (lines, size, weight, lh) => {
    const w = Math.max(...lines.map(l => textWidth(l, size, weight)));
    const h = (lines.length - 1) * size * lh + size * (ASCENT + DESCENT);
    return { lines, size: r2(size), weight, lh, w: r2(w), h: r2(h),
      // First baseline, relative to the box centre.
      y0: r2(-h / 2 + size * ASCENT) };
  };

  const clusters = dims.map((d, i) => {
    const dim = { ...word(wrap2(d.name, 14),
        Math.max(P.cloudDimMin, P.cloudDimMax * Math.sqrt(d.n / maxDim)), 700,
        1.0),
      id: d.id, dim: d.id, kind: 'dim', text: d.name, n: d.n,
      colour: d.colour, order: i };
    const terms = d.terms.map((t, k) => ({
      ...word(wrap2(t.text, P.cloudTermWrap),
        P.cloudTermMin + (P.cloudTermMax - P.cloudTermMin)
          * Math.sqrt(maxTerm > 1 ? (t.n - 1) / (maxTerm - 1) : 0), 400, 1.05),
      id: t.id, dim: d.id, kind: 'term', text: t.text, n: t.n,
      colour: d.colour, order: i, rank: k }));
    const ink = [dim, ...terms].reduce((a, b) => a + b.w * b.h, 0);
    return { id: d.id, dim, terms, R: Math.sqrt(P.cloudSlack * ink / Math.PI) };
  });

  // --- 2. pack the footprints, in stretched space ---------------------------
  const sx = Math.sqrt(P.cloudAspect);
  const toU = (x, y) => ({ u: x / sx, v: y * sx });
  const lo = toU(P.cloudLeft, P.cloudTop), hi = toU(P.cloudRight, P.cloudBottom);
  const mid = { u: (lo.u + hi.u) / 2, v: (lo.v + hi.v) / 2 };
  clusters.forEach((c, i) => {
    const a = Math.PI + (i / clusters.length) * Math.PI * 2;
    c.u = mid.u + (hi.u - lo.u) * 0.3 * Math.cos(a);
    c.v = mid.v + (hi.v - lo.v) * 0.3 * Math.sin(a);
  });
  for (let it = 0; it < 800; it++) {
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i], b = clusters[j];
        const du = b.u - a.u, dv = b.v - a.v;
        const d = Math.hypot(du, dv) || 1e-6;
        const over = a.R + b.R - d;
        if (over <= 0) continue;
        const pu = du / d * over / 2, pv = dv / d * over / 2;
        a.u -= pu; a.v -= pv; b.u += pu; b.v += pv;
      }
    }
    for (const c of clusters) {
      c.u += (mid.u - c.u) * 0.02;
      c.v += (mid.v - c.v) * 0.02;
      c.u = Math.max(lo.u + c.R, Math.min(hi.u - c.R, c.u));
      c.v = Math.max(lo.v + c.R, Math.min(hi.v - c.R, c.v));
    }
  }

  // --- 3. dimensions at their centres, then the codes -----------------------
  const placed = [];
  const gap = (a, b) => a.dim === b.dim ? P.cloudGap : P.cloudClusterGap;
  const hits = (x, y, b) => placed.some(q =>
    Math.abs(x - q.x) * 2 < b.w + q.w + 2 * gap(b, q)
    && Math.abs(y - q.y) * 2 < b.h + q.h + 2 * gap(b, q));
  const inside = (x, y, b) =>
    x - b.w / 2 >= P.cloudLeft && x + b.w / 2 <= P.cloudRight
    && y - b.h / 2 >= P.cloudTop && y + b.h / 2 <= P.cloudBottom;
  const power = (c, x, y) => {
    const p = toU(x, y);
    return (p.u - c.u) ** 2 + (p.v - c.v) ** 2 - c.R ** 2;
  };
  const mine = (c, x, y) => clusters.every(o =>
    o === c || power(c, x, y) <= power(o, x, y));

  for (const c of clusters) {
    Object.assign(c.dim, { x: c.u * sx, y: c.v / sx });
    placed.push(c.dim);
  }

  // Biggest codes first, so the most-cited sit closest to their dimension;
  // ties interleave the clusters, so no dimension takes the inner ring alone.
  const queue = clusters.flatMap(c => c.terms.map(t => ({ c, t })))
    .sort((a, b) => (b.t.size - a.t.size) || (a.t.rank - b.t.rank)
      || (a.t.order - b.t.order));
  const golden = Math.PI * (3 - Math.sqrt(5));
  let stray = 0;
  for (const { c, t } of queue) {
    const cx = c.dim.x, cy = c.dim.y;
    let spot = null;
    // Two passes: in territory, then -- only if a cluster has run out of room
    // -- anywhere free. The second pass is counted and reported as `stray`.
    for (const strict of [true, false]) {
      let th = t.rank * golden + t.order;
      // Archimedean: the radius grows ~7 px per turn, in steps of <= 4 px.
      for (let r = 0; r < 1400 && !spot;) {
        const x = cx + r * Math.cos(th) * sx;
        const y = cy + r * Math.sin(th) / sx;
        if (inside(x, y, t) && !hits(x, y, t) && (!strict || mine(c, x, y))) {
          spot = { x, y };
        }
        const step = Math.min(0.35, 4 / Math.max(r, 1));
        th += step;
        r += 7 * step / (Math.PI * 2);
      }
      if (spot) { if (!strict) stray++; break; }
    }
    if (!spot) throw new Error(`word cloud: no room for "${t.text}"`);
    Object.assign(t, spot);
    placed.push(t);
  }

  // --- 4. centre the whole cloud on the free stage --------------------------
  const x0 = Math.min(...placed.map(b => b.x - b.w / 2));
  const x1 = Math.max(...placed.map(b => b.x + b.w / 2));
  const y0 = Math.min(...placed.map(b => b.y - b.h / 2));
  const y1 = Math.max(...placed.map(b => b.y + b.h / 2));
  const dx = (P.cloudLeft + P.cloudRight) / 2 - (x0 + x1) / 2;
  const dy = (P.cloudTop + P.cloudBottom) / 2 - (y0 + y1) / 2;

  const out = b => ({ ...b, x: r2(b.x + dx), y: r2(b.y + dy) });
  return {
    dims: Object.fromEntries(clusters.map(c => [c.id, out(c.dim)])),
    terms: Object.fromEntries(clusters.flatMap(c =>
      c.terms.map(t => [t.id, out(t)]))),
    bounds: { x0: r2(x0 + dx), y0: r2(y0 + dy),
              x1: r2(x1 + dx), y1: r2(y1 + dy) },
    // Codes that had to leave their own territory to fit. Should be 0.
    stray,
  };
}

// ============================================================================
// node cells -- a weighted Voronoi (power diagram) inside a unit circle
// ============================================================================

/**
 * Review of 16 September 2026: on the rings, a node's position no longer says
 * which labs its respondents come from, so the highlighted nodes are split
 * into one cell per lab, cell AREA proportional to that lab's links.
 *
 * A power diagram rather than a plain Voronoi, because plain Voronoi cells
 * cannot be sized: each cell is the circle clipped by the power bisector
 * against every other seed, and the seed weights are nudged until each area
 * matches its share. No library -- half-plane clipping is a dozen lines.
 *
 * Seeds start on the bearing of their lab's anchor from the middle of the
 * anchors, so a lab sits on the same side of every node (East Brandenburg
 * upper right, Hessen labs below) and the cells can be read across the slide.
 *
 * Shares count MEMBERSHIPS: a researcher in two labs is in both cells, like
 * every other per-lab count in the deck. No-lab respondents get a grey cell.
 * Fixed iteration count, no randomness: deterministic by construction.
 */
function nodeCells(items, key, model, anchors) {
  const pts = model.labs.map(l => anchors.get(l.id)).filter(Boolean);
  const cx = d3.mean(pts, p => p.x), cy = d3.mean(pts, p => p.y);
  const bearing = new Map(model.labs.map(l => {
    const a = anchors.get(l.id);
    return [l.id, a ? Math.atan2(a.y - cy, a.x - cx) : 0];
  }));
  bearing.set('none', Math.PI / 2);

  return Object.fromEntries(items.map(it => {
    const people = model.respondents.filter(r => r[key].includes(it.id));
    const parts = [
      ...model.labs.map(l => ({ lab: l.id,
        v: people.filter(r => r.labIds.includes(l.id)).length })),
      { lab: 'none', v: people.filter(r => !r.labIds.length).length },
    ].filter(p => p.v > 0);
    return [it.id, powerCells(parts, bearing)];
  }));
}

function clipHalfPlane(poly, a, b, c) {      // keep a*x + b*y <= c
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const P = poly[k], Q = poly[(k + 1) % poly.length];
    const fp = a * P[0] + b * P[1] - c, fq = a * Q[0] + b * Q[1] - c;
    if (fp <= 0) out.push(P);
    if ((fp < 0) !== (fq < 0)) {
      const t = fp / (fp - fq);
      out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]);
    }
  }
  return out;
}

export function powerCells(parts, bearing, iterations = 400) {
  if (!parts.length) return [];
  const total = d3.sum(parts, p => p.v);
  if (parts.length === 1) {
    return [{ lab: parts[0].lab, v: parts[0].v, share: 1, got: 1,
      d: 'M1,0A1,1 0 1,1 -1,0A1,1 0 1,1 1,0Z' }];
  }
  const circle = d3.range(120).map(k =>
    [Math.cos(k / 120 * 2 * Math.PI), Math.sin(k / 120 * 2 * Math.PI)]);
  const s = parts.map(p => {
    const b = bearing.get(p.lab) ?? 0;
    return { ...p, x: 0.5 * Math.cos(b), y: 0.5 * Math.sin(b), w: 0 };
  });
  // Two labs on one bearing would start on the same point and never split.
  s.forEach((si, i) => s.forEach((sj, j) => {
    if (j > i && Math.hypot(si.x - sj.x, si.y - sj.y) < 0.05) {
      sj.x += 0.08 * Math.cos(j); sj.y += 0.08 * Math.sin(j);
    }
  }));

  let cells = [];
  const build = () => s.map((si, i) => {
    let poly = circle;
    s.forEach((sj, j) => {
      if (i === j || poly.length < 3) return;
      poly = clipHalfPlane(poly, 2 * (sj.x - si.x), 2 * (sj.y - si.y),
        (sj.x ** 2 + sj.y ** 2 - sj.w) - (si.x ** 2 + si.y ** 2 - si.w));
    });
    return poly;
  });
  for (let it = 0; it < iterations; it++) {
    cells = build();
    cells.forEach((poly, i) => {
      const area = poly.length > 2 ? Math.abs(d3.polygonArea(poly)) : 0;
      const want = Math.PI * s[i].v / total;
      s[i].w += (want - area) / Math.PI * 0.5;
      if (poly.length > 2) {
        const c = d3.polygonCentroid(poly);
        s[i].x += (c[0] - s[i].x) * 0.1;
        s[i].y += (c[1] - s[i].y) * 0.1;
      }
    });
  }
  cells = build();
  return cells.map((poly, i) => ({
    lab: s[i].lab, v: s[i].v,
    share: r3(s[i].v / total),
    got: r3(poly.length > 2 ? Math.abs(d3.polygonArea(poly)) / Math.PI : 0),
    d: poly.length > 2
      ? 'M' + poly.map(p => `${r3(p[0])},${r3(p[1])}`).join('L') + 'Z' : '',
  }));
}

/**
 * The two groups of participatory activities on the participation matrix.
 * The first four are part of doing the research; the last two are about
 * dissemination and building the network (review of 16 September 2026).
 * Keys are data.json statement keys; anything absent from the data is skipped.
 */
export const PARTICIPATION_GROUPS = [
  { id: 'research', label: 'Research process',
    keys: ['cointerpret', 'codesign', 'indepth_convo', 'uses_pract_data'] },
  { id: 'network', label: 'Dissemination & networks',
    keys: ['advises', 'brokers'] },
];

/**
 * Scene 5.2: lab x activity. Each bubble is the lab's cohort, as in scene 4.5.
 * One SOLID dot per researcher answering "Like me" or "Very much like me", one
 * HOLLOW dot per researcher answering "Unsure" or lower. No answer, no dot.
 * Both populations go through ONE packDots call, solid first, so density is
 * constant and a mostly-hollow bubble reads as a skills gap from the back.
 */
function layoutParticipation(model, params) {
  const { partX: x0, partY: y0, partColW: cw, partRowH: ch,
          partGroupGap: gap } = params;
  const rDot = params.matrixDotR;
  const maxN = Math.max(1, ...model.labs.map(l => l.n));
  const rOf = n => params.matrixBubbleMax
    * Math.pow(Math.max(0, n) / maxN, params.matrixBubbleExp);
  const rows = model.spine?.rows ?? [];
  const labelOf = new Map(rows.map(r => [r.key, r.label]));

  const cols = [];
  const groups = [];
  let j = 0;
  PARTICIPATION_GROUPS.forEach((grp, gi) => {
    const keys = grp.keys.filter(k => labelOf.has(k));
    if (!keys.length) return;
    const first = j;
    for (const key of keys) {
      cols.push({ key, label: labelOf.get(key), group: grp.id,
        x: r2(x0 + j * cw + cw / 2 + gi * gap) });
      j++;
    }
    groups.push({ id: grp.id, label: grp.label,
      x0: r2(x0 + first * cw + gi * gap),
      x1: r2(x0 + j * cw + gi * gap) });
  });

  const cells = {}, dots = {}, labRows = [];
  model.labs.forEach((l, i) => {
    const cy = y0 + i * ch + ch / 2;
    const R = rOf(l.n);
    labRows.push({ labId: l.id, y: r2(cy), r: r2(R), n: l.n });
    const members = model.respondents.filter(r => r.labIds.includes(l.id));
    for (const col of cols) {
      const affirm = members.filter(r => r.affirm?.[col.key]).map(r => r.id);
      const not = members.filter(r => !r.affirm?.[col.key]
        && r.participatory?.[col.key] != null).map(r => r.id);
      cells[`${l.id}|${col.key}`] = {
        x: col.x, y: r2(cy), r: r2(R),
        nAffirm: affirm.length, nNot: not.length,
      };
      const ids = [...affirm.map(rid => ({ rid, role: 'affirm' })),
                   ...not.map(rid => ({ rid, role: 'not' }))];
      const pts = packDots(ids.length, R - rDot - 2, rDot);
      ids.forEach(({ rid, role }, k) => {
        dots[`${l.id}|${col.key}|${rid}`] = {
          x: r2(col.x + pts[k].x), y: r2(cy + pts[k].y),
          lab: l.id, key: col.key, respondent: rid, role,
        };
      });
    }
  });

  return {
    cells, dots, rows: labRows, cols, groups, dotR: rDot,
    headerY: r2(y0 - 30),
    labelX: r2(x0 - 34),
  };
}

/**
 * Deterministic sunflower packing of n dots inside a circle of radius R.
 *
 * Phyllotaxis rather than a grid: it fills a DISC evenly, which a square grid
 * does not, and it stays centred and roughly circular at every n so the cells
 * look like a family. No randomness, so the figure is identical every run
 * (SPEC 2.2).
 *
 * CONSTANT DENSITY, not fill-the-bubble. In a sunflower the i-th point sits at
 * spread*sqrt(i), so a fixed `spread` makes the cluster's AREA proportional to
 * n -- which is the whole point: 4 of 19 has to look sparse next to 17 of 19.
 * Scaling spread by 1/sqrt(n) would make every cell equally full and destroy
 * the comparison. If the cluster would outgrow the bubble anyway, it falls
 * back to filling it exactly rather than spilling dots outside their own
 * bubble.
 */
function packDots(n, R, rDot) {
  if (n <= 0 || R <= 0) return [];
  if (n === 1) return [{ x: 0, y: 0 }];

  const golden = Math.PI * (3 - Math.sqrt(5));      // ~2.39996 rad
  const ideal = 2.15 * rDot;                        // tightest non-touching
  const maxSpread = R / Math.sqrt(Math.max(1, n - 0.5));
  const spread = Math.min(ideal, maxSpread);

  const pts = [];
  for (let i = 0; i < n; i++) {
    const rad = spread * Math.sqrt(i + 0.5);
    const ang = i * golden;
    pts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
  }
  return pts;
}

// ============================================================================
// scene 5 -- the beeswarm. Same objects, new arrangement.
// ============================================================================

// ============================================================================
// scene 5.2 -- the participation wall
// ============================================================================
// One column per person, one row per scored statement.
//
// WHY NOT THE OBVIOUS SHAPE. The natural first idea is statements on x and the
// five agreement levels on y, with a line per person connecting their answers.
// It does not survive contact with the data: there are only five discrete y
// values and 49 people, so lines are massively coincident -- most of the 49
// trace one of a handful of identical paths, drawn on top of each other. The
// jitter needed to separate them is exactly what destroys the "this is one
// person" reading the lines were for.
//
// Transposing fixes it at the root. Give every person their own x slot and
// nothing can overplot: 49 columns x 6 rows = 294 marks, each in its own cell.
// The connecting line survives because it is now vertical and private to one
// column, and "engaged across several of these" becomes a tall run of filled
// dots rather than a path to be traced.
//
// Columns are ordered by breadth, so the wall's filled silhouette rises to the
// right and the question -- is anyone doing several of these? -- is answered by
// the shape before anybody reads a number.
//
// Closed-form, so no simulation and no drift.
function layoutSpine(model, params) {
  const SP = model.spine;
  if (!SP || !SP.rows.length) return null;

  const n = SP.order.length;
  const x0 = params.spineX0;
  const pitch = n > 1 ? params.spineWidth / (n - 1) : 0;

  // Rows, and the GROUP GAP between the ladder and the modes. SPEC 4.2: the
  // three modes are lateral, at comparable intensity, not higher rungs. One
  // continuous axis would assert an ordering across all six that the
  // instrument does not support, so the gap is load-bearing rather than
  // decorative -- it is the visual statement that these are two scales.
  const rows = [];
  let y = params.spineTop;
  let prevKind = null;
  for (const row of SP.rows) {
    if (prevKind && row.kind !== prevKind) y += params.spineGroupGap;
    rows.push({
      key: row.key, kind: row.kind, rung: row.rung,
      label: row.label, nAffirm: row.nAffirm, nUnsure: row.nUnsure,
      y: r2(y),
    });
    prevKind = row.kind;
    y += params.spineRowGap;
  }
  const rowByKey = new Map(rows.map(r => [r.key, r]));

  // Each group's vertical extent, for the bracket that names it on screen.
  const groups = [];
  for (const row of rows) {
    const g = groups.find(x => x.kind === row.kind);
    if (g) { g.y0 = Math.min(g.y0, row.y); g.y1 = Math.max(g.y1, row.y); }
    else groups.push({ kind: row.kind, y0: row.y, y1: row.y });
  }

  const cols = [];
  const dots = {};
  const spines = {};

  SP.order.forEach((rid, i) => {
    const r = model.respondents.find(p => p.id === rid);
    const cx = r2(x0 + i * pitch);
    cols.push({
      rid, x: cx, breadth: r.breadth,
      // SPEC 4.3's contradiction, marked under the column rather than
      // resolved away: this person said they do not work with practitioners.
      filter: !!r.noPractitioners,
      flagged: !!r.flagged,
    });

    // Per group, the affirmative rows this person reaches.
    const reached = {};
    for (const row of rows) {
      const v = r.participatory[row.key];
      const affirm = !!r.affirm[row.key];
      dots[`${rid}|${row.key}`] = {
        x: cx, y: row.y, rid, key: row.key, kind: row.kind,
        value: v ?? null,
        // Four states, not two. "Unsure" is a real answer and must not be
        // collapsed into a no, and an unanswered cell is not a no either.
        level: v == null ? 'unanswered'
             : affirm ? 'affirm'
             : v === 2 ? 'unsure' : 'no',
      };
      if (affirm) (reached[row.kind] ??= []).push(row.y);
    }

    // The spine: one segment per GROUP, never one line across both. A single
    // line spanning the gap would undo the separation the gap exists to make.
    // A lone affirmative needs no segment -- its dot already says it.
    for (const [kind, ys] of Object.entries(reached)) {
      if (ys.length < 2) continue;
      spines[`${rid}|${kind}`] = {
        rid, kind, x: cx,
        y0: r2(Math.min(...ys)), y1: r2(Math.max(...ys)),
      };
    }
  });

  return {
    cols, rows, dots, spines, groups,
    pitch: r2(pitch),
    dotR: params.spineDotR,
    // Right-aligned row labels live to the left of the first column.
    labelX: r2(x0 - params.spineLabelGap),
    // Where the filter marks and the breadth axis caption go.
    filterY: r2(y - params.spineRowGap + params.spineFilterGap),
    bounds: {
      x0: r2(x0), y0: r2(rows[0].y),
      x1: r2(x0 + params.spineWidth), y1: r2(rows[rows.length - 1].y),
    },
  };
}

function layoutSwarm(model, params) {
  const levels = 4;                                  // engagement_level 0..3
  const w = STAGE.w * params.swarmWidth;
  const x0 = (STAGE.w - w) / 2;
  const x = d3.scalePoint()
    .domain(d3.range(levels))
    .range([x0, x0 + w]);
  const yc = STAGE.h * params.swarmY;

  // Flagged respondents are laid out and rendered (SPEC 4.3: shown, not
  // hidden) but the scene states that they are excluded from the
  // distribution. Position them on the axis like anyone else.
  const nodes = model.respondents.map((r, i) => ({
    id: r.id,
    level: r.engagement ?? 0,
    // deterministic seed spread so the swarm opens symmetrically
    x: x(r.engagement ?? 0),
    y: yc + ((i % 2 ? 1 : -1) * (8 + (i % 17) * 3)),
  }));

  const sim = d3.forceSimulation(nodes)
    .force('x', d3.forceX(d => x(d.level)).strength(params.swarmXStrength))
    .force('y', d3.forceY(yc).strength(params.swarmYStrength))
    .force('collide', d3.forceCollide(params.swarmCollide).iterations(3))
    .stop();

  for (let i = 0; i < params.ticksSwarm; i++) sim.tick();

  return {
    axis: {
      y: r2(yc),
      ticks: d3.range(levels).map(l => ({ level: l, x: r2(x(l)) })),
    },
    positions: Object.fromEntries(
      nodes.map(n => [n.id, { x: r2(n.x), y: r2(n.y) }])),
  };
}

// ============================================================================
// pie geometry -- multi-lab respondent dots
// ============================================================================
// A researcher in more than one Living Lab is drawn as a divided dot, one
// equal wedge per lab, rather than the first lab's colour plus a ring.
//
// Why not a ring: `--accent` is byte-identical to `--lab-0` and `--emphasis`
// is a near-match for `--lab-3`, so any hue chosen for the ring makes the
// callout vanish for one of the five labs -- worst of all in the projector
// palette, where the pairs converge further. And "first lab" is an artefact
// of the survey's option order, not a primary affiliation the data records.
//
// Geometry lives here rather than in the renderer because it is pure: the
// respondent radius is identical in every scene, so a wedge is a function of
// (index, count, radius) alone and can be tested without a browser.
const TAU = Math.PI * 2;

export function wedgePath(i, n, rr) {
  const a0 = -Math.PI / 2 + (i / n) * TAU;
  const a1 = -Math.PI / 2 + ((i + 1) / n) * TAU;
  const x0 = (rr * Math.cos(a0)).toFixed(3);
  const y0 = (rr * Math.sin(a0)).toFixed(3);
  const x1 = (rr * Math.cos(a1)).toFixed(3);
  const y1 = (rr * Math.sin(a1)).toFixed(3);
  // Only n === 1 would need the large-arc flag, and a single lab gets no pie.
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const r = rr.toFixed(3);
  return `M0,0L${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}Z`;
}

// ============================================================================
// link geometry -- shared so the lab and the scenes draw identical arcs
// ============================================================================

/**
 * Curved arc between two points (SPEC 6.5: curved arcs, not straight lines).
 * curvature 0 gives a straight line; 0.3 is a gentle bow.
 *
 * The bow always bends the same way for a given ordered pair, so parallel
 * links between the same two clusters fan out instead of overprinting.
 */
export function arc(x1, y1, x2, y2, curvature) {
  if (!curvature) return `M${r2(x1)},${r2(y1)}L${r2(x2)},${r2(y2)}`;
  const dx = x2 - x1, dy = y2 - y1;
  const dr = Math.hypot(dx, dy) / (2 * curvature);
  return `M${r2(x1)},${r2(y1)}A${r2(dr)},${r2(dr)} 0 0,1 ${r2(x2)},${r2(y2)}`;
}

// --- rounding: layout.json is committed, so keep the diffs quiet ------------
const r2 = v => Math.round(v * 100) / 100;
const r3 = v => Math.round(v * 1000) / 1000;
