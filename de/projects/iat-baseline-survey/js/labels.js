// ============================================================================
// labels.js -- keep text legible when nodes crowd.
//
// Scene 3 puts sixteen theme labels on a stage where the five lab anchors are
// very nearly COLLINEAR (Rheingau -> Hessian LMR -> North Hesse -> Havelland ->
// East Brandenburg runs roughly SW to NE). Every theme position is a weighted
// centroid of those anchors, so every theme lands inside their convex hull --
// which is a thin diagonal sliver. Sixteen labels in a sliver overprint into
// mush.
//
// That crowding is a real property of the data and the SPEC is explicit that
// position must stay honest, so this module does NOT move nodes. It moves only
// the TEXT, and it records how far each label was pushed so a scene can draw a
// leader line back to the node it belongs to.
// ============================================================================

/**
 * Estimate a text box without measuring the DOM.
 *
 * Deliberately approximate: measuring 16 labels via getBBox forces layout on
 * every slider drag, and the layout must also be computable headlessly (see
 * scripts/verify_layout.mjs). 0.52 em average advance is a good fit for Segoe
 * UI at these sizes; it errs slightly wide, which is the safe direction.
 */
export function measure(text, size) {
  return { w: String(text).length * size * 0.52, h: size * 1.05 };
}

/**
 * Push overlapping labels apart, mostly vertically.
 *
 * Text boxes are wide and short, so vertical separation buys legibility far
 * more cheaply than horizontal. Each label keeps its anchor point in `ax`/`ay`
 * so the caller can draw a leader when `moved` is large.
 *
 * Mutates and returns the array.
 */
export function dodge(labels, opts = {}) {
  const {
    iterations = 90,
    padX = 5,
    padY = 3,
    // How strongly a label is pulled back toward where it wanted to be.
    // Without this, one crowded cluster can march labels off across the stage.
    homing = 0.06,
    bounds = null,          // {x0, y0, x1, y1}
  } = opts;

  for (const l of labels) {
    // Multi-line labels (wrap2) are as wide as their LONGEST line and as tall
    // as the stack. Measuring the joined string instead would over-estimate
    // width by 2x and shove neighbours apart for no reason.
    const lines = l.lines && l.lines.length ? l.lines : [l.text];
    const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
    const m = measure(longest, l.size);
    l._w = m.w; l._h = m.h * lines.length; l._lh = m.h;
    l.ax = l.x; l.ay = l.y;        // remember the anchor
    // half-width offset by text-anchor, so overlap tests use the real box
    l._ox = l.anchor === 'start' ? m.w / 2
          : l.anchor === 'end' ? -m.w / 2 : 0;
  }

  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i], b = labels[j];
        const dx = (b.x + b._ox) - (a.x + a._ox);
        const dy = b.y - a.y;
        const ox = (a._w + b._w) / 2 + padX - Math.abs(dx);
        const oy = (a._h + b._h) / 2 + padY - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;      // no overlap

        // Separate along y: cheaper visually than shoving text sideways.
        const push = oy / 2;
        const sign = dy === 0 ? (i % 2 ? 1 : -1) : Math.sign(dy);
        a.y -= push * sign;
        b.y += push * sign;
        moved = true;
      }
    }
    // ease each label back toward its anchor, so it does not drift forever
    for (const l of labels) l.y += (l.ay - l.y) * homing;
    if (!moved) break;
  }

  for (const l of labels) {
    if (bounds) {
      // `y` is the FIRST baseline and extra lines stack downward, so the top
      // bound needs one line of room and the bottom bound the rest. Clamping
      // by the whole block pushed three-line labels near the top back down
      // onto their own node.
      l.y = Math.max(bounds.y0 + l._lh,
        Math.min(bounds.y1 - (l._h - l._lh), l.y));
    }
    l.moved = Math.hypot(l.x - l.ax, l.y - l.ay);
    delete l._w; delete l._h; delete l._lh; delete l._ox;
  }
  return labels;
}

/**
 * Split a label into at most two lines at the most balanced word break.
 *
 * Theme and use case labels ("Climate-resilient cropping", "Demography &
 * livelihoods") are far wider than the nodes they sit on, and a single line
 * guarantees neighbours overprint however hard the dodge works. Two balanced
 * lines roughly halve the width, which the dodge then only has to fine-tune.
 *
 * Returns [line] or [line, line]. Never splits a single long word.
 */
export function wrap2(text, maxChars = 14) {
  const s = String(text);
  if (s.length <= maxChars) return [s];
  const words = s.split(/\s+/);
  if (words.length === 1) return [s];

  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    const diff = Math.abs(a - b);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}
