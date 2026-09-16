/* ============================================================
   Director — maps slide state onto the persistent strata diagram.

   Slides declare what the diagram should be doing; this file reads
   that and drives it. Reveal keeps ownership of the keyboard, the
   progress bar, speaker view and PDF export. Nothing here intercepts
   a key event.

   Slide / fragment attributes
   ---------------------------
     data-strata-layout="full|aside|corner|off"
     data-strata-active="support|transfer|integration|none"
     data-strata-variant="panel|horizon"   (optional, per slide)
     data-strata-park="left|right"         (optional, "aside" only)

   Layout and active may also sit on a .fragment inside a slide, in
   which case the last VISIBLE fragment carrying the attribute wins.
   That is what steps the strata one at a time on the overview slide,
   and in the horizon variant it is what holds the bands back until the
   first advance: no active stratum, no bands.

   VARIANT defaults to whatever #stage carries as data-variant, so the
   deck picks one and a slide may override it.

   PARK is which side of the slide the mark sits on at "aside", and so
   which side the project content gets. It defaults to left for every
   stratum, putting all project content on the right. The director
   writes the resolved value back onto the slide so css/deck.css can
   flip section.project without repeating the rule.

   "off" hides the diagram but deliberately keeps the previous layout
   transform, so it fades out where it stands instead of flying back
   to centre on its way off screen (see css/stage.css).
   ============================================================ */

(function () {
  "use strict";

  var LAYOUTS = ["full", "aside", "corner", "off"];
  /* Which side the mark parks at when a slide does not say. Every
     stratum parks left, so every project slide puts its content on the
     right. A slide can still opt out with data-strata-park="right". */
  var DEFAULT_PARK = "left";
  var stage, diagram;
  var lastVisibleLayout = "full";
  /* Captured once at init. The director writes the RESOLVED variant back
     onto #stage for CSS, so reading the fallback off the element would
     make a single slide's override stick for the rest of the deck. */
  var deckVariant = "panel";

  function attr(el, name) {
    return el && el.getAttribute ? el.getAttribute(name) : null;
  }

  /* Read the slide's declared state, then let visible fragments override it. */
  function resolveState(slide) {
    var layout = attr(slide, "data-strata-layout");
    var active = attr(slide, "data-strata-active");

    if (slide) {
      var frags = slide.querySelectorAll(
        ".fragment.visible[data-strata-active], .fragment.visible[data-strata-layout]"
      );
      /* Later fragments win, so a plain forward pass leaves the most
         recently shown value in place. On fragmenthidden the element
         has already lost .visible, so recomputing from scratch here
         unwinds correctly with no bookkeeping. */
      for (var i = 0; i < frags.length; i++) {
        var fa = attr(frags[i], "data-strata-active");
        var fl = attr(frags[i], "data-strata-layout");
        if (fa) active = fa;
        if (fl) layout = fl;
      }
    }

    if (LAYOUTS.indexOf(layout) === -1) layout = "off";
    if (active === "none" || !active) active = null;

    var variant = attr(slide, "data-strata-variant") || deckVariant;
    if (variant !== "horizon") variant = "panel";

    var park = attr(slide, "data-strata-park");
    if (park !== "left" && park !== "right") park = DEFAULT_PARK;

    return { layout: layout, active: active, variant: variant, park: park };
  }

  function apply(slide) {
    if (!stage || !diagram) return;

    var state = resolveState(slide);
    var visible = state.layout !== "off";

    if (visible) lastVisibleLayout = state.layout;

    /* Keep the last real layout while hidden so the fade happens in place. */
    stage.dataset.layout = visible ? state.layout : lastVisibleLayout;
    stage.dataset.visible = visible ? "true" : "false";
    stage.dataset.variant = state.variant;
    stage.dataset.park = state.park;

    /* So css/deck.css can flip section.project to the other side
       without restating which stratum goes where. */
    if (slide && slide.dataset) slide.dataset.strataPark = state.park;

    diagram.setVariant(state.variant);
    diagram.setPark(state.park);
    diagram.setLayout(visible ? state.layout : lastVisibleLayout);
    diagram.setActive(state.active);

    /* Match the seams and disc edge to the slide's own ground, so the
       mark sits on a dark divider as deliberately as it does on paper. */
    diagram.setBackground(attr(slide, "data-background-color"));
  }

  function init() {
    stage = document.getElementById("stage");
    var host = document.getElementById("strata");
    if (!stage || !host || !window.StrataDiagram) return;

    deckVariant = stage.dataset.variant === "horizon" ? "horizon" : "panel";

    /* The horizon variant's bands live in their own untransformed layer
       so they can be drawn in slide coordinates while the mark keeps
       the stage transform that lets it travel between slides. */
    diagram = window.StrataDiagram.mount(host, {
      variant: deckVariant,
      bands: document.getElementById("strata-bands")
    });

    /* Start hidden; the first `ready` sets the real state. */
    stage.dataset.layout = "full";
    stage.dataset.visible = "false";

    /* `slidechanged` does NOT fire for the initial slide, so `ready` is
       load-bearing rather than belt-and-braces. */
    Reveal.on("ready", function (e) { apply(e.currentSlide); });
    Reveal.on("slidechanged", function (e) { apply(e.currentSlide); });
    Reveal.on("fragmentshown", function (e) { apply(e.fragment.closest("section")); });
    Reveal.on("fragmenthidden", function (e) { apply(e.fragment.closest("section")); });

    /* Reveal is already initialised by the time this runs (deck.js awaits
       it), but `ready` may have fired first on a fast load. */
    if (Reveal.isReady && Reveal.isReady()) apply(Reveal.getCurrentSlide());

    window.__dmlDiagram = diagram; /* console handle for tuning */
  }

  window.DeckDirector = { init: init };
})();
