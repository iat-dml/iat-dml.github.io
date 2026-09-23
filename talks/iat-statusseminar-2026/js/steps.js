/* ============================================================
   Step engine.

   A slide declares how many build steps it has with data-steps="N".
   Before reveal starts, this file appends N invisible fragments to that
   slide, so the presenter clicker advances the build like any other
   fragment. On every fragment or slide change the slide's current step
   (the number of those fragments now visible) is written to
   section[data-step], and every element inside is updated:

     data-at="n"          .is-on while step >= n
     data-until="m"       ...and step <= m (use with data-at)
     data-dim-after="n"   .is-dim once step > n
     data-focus="n m"     .is-focus while step is one of the listed

   All motion lives in css/linkages.css and hangs off those classes, so
   the markup stays declarative and each diagram can be read top to
   bottom with its step numbers.
   ============================================================ */

var DeckSteps = (function () {
  function addMarkers() {
    document.querySelectorAll(".reveal .slides section[data-steps]").forEach(function (slide) {
      var n = parseInt(slide.getAttribute("data-steps"), 10) || 0;
      for (var i = 1; i <= n; i++) {
        var m = document.createElement("span");
        m.className = "fragment step-marker";
        m.setAttribute("aria-hidden", "true");
        slide.appendChild(m);
      }
    });
  }

  function update(slide) {
    if (!slide || !slide.hasAttribute("data-steps")) return;
    var step = slide.querySelectorAll(".step-marker.visible").length;
    slide.setAttribute("data-step", step);

    slide.querySelectorAll("[data-at]").forEach(function (el) {
      var at = parseInt(el.getAttribute("data-at"), 10);
      var until = el.hasAttribute("data-until") ? parseInt(el.getAttribute("data-until"), 10) : Infinity;
      el.classList.toggle("is-on", step >= at && step <= until);
    });
    slide.querySelectorAll("[data-dim-after]").forEach(function (el) {
      el.classList.toggle("is-dim", step > parseInt(el.getAttribute("data-dim-after"), 10));
    });
    slide.querySelectorAll("[data-focus]").forEach(function (el) {
      var list = el.getAttribute("data-focus").split(/\s+/).map(Number);
      el.classList.toggle("is-focus", list.indexOf(step) !== -1);
    });
  }

  function updateAll() {
    document.querySelectorAll(".reveal .slides section[data-steps]").forEach(update);
  }

  function init(reveal) {
    var current = function () { update(reveal.getCurrentSlide()); };
    reveal.on("fragmentshown", current);
    reveal.on("fragmenthidden", current);
    reveal.on("slidechanged", current);
    /* Print/PDF shows every fragment, so every slide lands on its last step. */
    updateAll();
    current();
  }

  addMarkers();
  return { init: init, update: update };
})();
