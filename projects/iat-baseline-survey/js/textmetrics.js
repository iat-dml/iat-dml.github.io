// ============================================================================
// textmetrics.js -- how wide a string is in Segoe UI, without a DOM.
//
// labels.js estimates every string at 0.52 em per character, which is fine for
// nudging labels apart and far too loose for a word cloud: packed words need
// real extents, or they either overprint or sit in visibly uneven gaps. The
// layout must stay computable headlessly (freeze_layout.mjs runs in Node), so
// the widths are a table rather than a measurement.
//
// Measured once in Chrome on Windows (canvas measureText, 100 px Segoe UI,
// 17 September 2026), for the printable ASCII range, rounded to whole units.
// That rounding goes both ways, so a sum can land a fraction of a percent
// under the rendered getBBox width (measured: "Environment" 709 vs 711 px at
// 118 px bold). SAFETY absorbs it, keeping every estimate on the wide side --
// the safe direction for collision tests. Anything outside the table
// (umlauts, dashes) takes a wide default rather than a narrow one.
// ============================================================================

const ADVANCE = {
  400: [27,28,39,59,54,82,80,23,30,30,42,68,22,40,22,39,54,54,54,54,54,54,54,54,54,54,22,22,68,68,68,45,96,65,57,62,70,51,49,69,71,27,36,58,47,90,75,75,56,75,60,53,52,69,62,93,59,55,57,30,38,30,68,42,27,51,59,46,59,52,31,59,57,24,24,50,24,86,57,59,59,59,35,42,34,57,48,72,46,48,45,30,24,30,68],
  600: [27,30,44,59,56,84,72,26,33,33,43,69,24,40,24,41,56,40,56,56,58,56,56,54,56,56,24,24,69,69,69,44,95,67,60,62,72,52,50,70,74,29,40,61,49,92,77,76,58,76,62,54,55,70,64,97,62,58,59,33,40,33,69,42,29,52,60,47,60,53,34,60,58,26,26,52,26,89,58,60,60,60,37,43,36,58,51,76,50,51,46,33,28,33,69],
  700: [28,33,49,59,58,87,85,29,37,37,46,71,27,40,27,44,58,58,58,58,58,58,58,58,58,58,27,27,71,71,71,44,95,70,64,62,74,53,52,71,77,32,45,65,51,96,79,76,61,76,65,56,59,72,67,100,66,61,61,37,44,37,71,42,31,54,62,48,62,54,38,62,60,28,28,56,28,92,60,61,62,62,40,44,39,60,54,80,55,54,48,37,33,37,71],
};

const SAFETY = 1.015;

/** Ink extent above and below the alphabetic baseline, in em. */
export const ASCENT = 0.75;
export const DESCENT = 0.24;

/** Width in px of `text` at `size` px. Weights snap to 400, 600 or 700. */
export function textWidth(text, size, weight = 400) {
  const table = ADVANCE[weight >= 700 ? 700 : weight >= 600 ? 600 : 400];
  let w = 0;
  for (const ch of String(text)) {
    const i = ch.charCodeAt(0) - 32;
    w += i >= 0 && i < table.length ? table[i] : 70;
  }
  return w * size / 100 * SAFETY;
}
