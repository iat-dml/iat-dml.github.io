// ============================================================================
// shell.js -- layer 3 (SPEC 2). Answers exactly one question: which beat.
//
// A keyboard controller, deliberately small. Presentation clickers send
// PageDown / PageUp (or the arrow keys), so those advance, as does a mouse
// click (Shift-click goes back). The beat is kept in the URL hash, so a reload
// or a rehearsal link lands on the same press.
//
// Swapping this for Reveal.js later must not touch beats.js or stage.js: the
// only thing crossing the boundary is go(i, { animate }).
// ============================================================================

const NEXT = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']);
const PREV = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']);

/**
 * @param {object} o
 * @param {number} o.count             number of beats
 * @param {(i: number) => string} o.idOf   beat id for the hash
 * @param {(id: string) => number} o.indexOf  inverse of idOf, -1 if unknown
 * @param {(i: number, o: {animate: boolean}) => void} o.go  draw beat i
 * @param {(key: string) => void} [o.onKey]  anything the shell does not own
 */
export function createShell({ count, idOf, indexOf, go, onKey }) {
  let current = -1;

  function to(i, animate) {
    const next = Math.max(0, Math.min(count - 1, i));
    if (next === current) return;
    current = next;
    history.replaceState(null, '', '#' + idOf(current));
    go(current, { animate });
  }

  // A jump -- first load, a pasted link, Home/End -- is a CUT. Only a single
  // step forwards or back animates, because only then is the previous
  // picture the one the audience is looking at.
  const fromHash = () => indexOf(decodeURIComponent(location.hash.slice(1)));

  window.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (NEXT.has(e.key)) to(current + 1, true);
    else if (PREV.has(e.key)) to(current - 1, true);
    else if (e.key === 'Home') to(0, false);
    else if (e.key === 'End') to(count - 1, false);
    else { onKey?.(e.key); return; }
    e.preventDefault();
  });
  // A mouse click advances too, for a presenter without a clicker. Shift-click
  // steps back; middle and right buttons are left to the browser.
  window.addEventListener('click', e => {
    if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    to(current + (e.shiftKey ? -1 : 1), true);
  });
  window.addEventListener('hashchange', () => {
    const i = fromHash();
    if (i >= 0) to(i, false);
  });

  to(Math.max(0, fromHash()), false);
  return { get index() { return current; }, to };
}
