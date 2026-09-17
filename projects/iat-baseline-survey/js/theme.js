// ============================================================================
// theme.js -- brand tokens, read from CSS.
//
// css/theme.css is the SINGLE source of truth for every colour. This module
// only reads the custom properties back out, so a hex value never exists in
// two places. That also means the .projector variant works for free: flip the
// body class, call refresh(), and every D3 fill follows.
// ============================================================================

const cache = new Map();

function raw(name) {
  if (cache.has(name)) return cache.get(name);
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  cache.set(name, v);
  return v;
}

/** Drop every cached token. Call after toggling the .projector class. */
export function refresh() {
  cache.clear();
}

/** Toggle the higher-contrast presentation variant (SPEC section 7). */
export function setProjector(on) {
  document.body.classList.toggle('projector', !!on);
  refresh();
}

export const isProjector = () => document.body.classList.contains('projector');

// --- colours ----------------------------------------------------------------

export const ink        = () => raw('--ink');
export const inkBody    = () => raw('--ink-body');
export const inkMute    = () => raw('--ink-mute');
export const paper      = () => raw('--paper');
export const rule       = () => raw('--rule');

export const mapFill      = () => raw('--map-fill');
export const mapFillMute  = () => raw('--map-fill-mute');
export const mapStroke    = () => raw('--map-stroke');

export const accent  = () => raw('--accent');
export const emphasis = () => raw('--emphasis');
export const flag    = () => raw('--flag');
export const gain    = () => raw('--gain');
export const loss    = () => raw('--loss');
export const labNone = () => raw('--lab-none');

export const linkInk     = () => raw('--link');
export const linkOpacity = () => parseFloat(raw('--link-opacity'));
export const linkDull    = () => parseFloat(raw('--link-dull'));

/**
 * Colour for a Living Lab, by its data.json id ("lab-0" .. "lab-4"), or
 * the achromatic no-lab grey for null / "none" / anything unrecognised.
 *
 * Unrecognised ids fall through to grey rather than throwing: a lab that
 * silently loses its colour is obvious on screen, whereas an exception
 * mid-transition kills the whole deck.
 */
export function labColour(labId) {
  if (!labId || labId === 'none') return labNone();
  const v = raw(`--${labId}`);
  return v || labNone();
}

/** Ordered array of the five lab colours, for legends and ring segments. */
export function labColours(n = 5) {
  return Array.from({ length: n }, (_, i) => labColour(`lab-${i}`));
}

// --- type scale (viewBox units at 1920x1080) --------------------------------

export const fs = {
  title: () => parseFloat(raw('--fs-title')),
  head:  () => parseFloat(raw('--fs-head')),
  body:  () => parseFloat(raw('--fs-body')),
  label: () => parseFloat(raw('--fs-label')),
  min:   () => parseFloat(raw('--fs-min')),
};

/** The 1920x1080 stage, as a viewBox. Nothing anywhere uses pixel-absolute
 *  layout (SPEC section 7). */
export const STAGE = { w: 1920, h: 1080 };
