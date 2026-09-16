/* ============================================================
   Media handoff — a card grows into a fullscreen video.

   A project slide parks the demo's opening frame inside its media
   card and tags it:

     <video data-handoff="ll-explorer" poster="..."> ... </video>

   The next slide plays the same file fullscreen and claims that tag:

     <video data-grow-from="ll-explorer" data-autoplay> ... </video>

   On the way in, this file runs a FLIP: the fullscreen video is
   painted at the card's position and size, then released to its own
   layout in one transition, so the frame appears to grow out of the
   card rather than cut to it.

   Deliberate limits
   -----------------
   - Forward only. Arriving at the video slide from anywhere other
     than its source slide (a deep link, or stepping back from the
     following slide) just shows the video, no animation.
   - Honours prefers-reduced-motion.
   - Scale is uniform and taken from width; card and video need not
     share an aspect ratio, and the height difference is split evenly
     so the two frames stay concentric while travelling.
   ============================================================ */

(function () {
  "use strict";

  var DURATION = 700;
  var EASE = "cubic-bezier(0.45, 0.05, 0.2, 1)";

  /* Rects measured while a source slide was on screen, keyed by tag.
     Measuring at leave time is unreliable -- reveal may already have
     taken the outgoing slide out of layout -- so cache on arrival. */
  var rects = {};

  function reduceMotion() {
    return window.matchMedia &&
           window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function measure(slide) {
    if (!slide || !slide.querySelectorAll) return;
    var sources = slide.querySelectorAll("[data-handoff]");
    for (var i = 0; i < sources.length; i++) {
      var r = sources[i].getBoundingClientRect();
      if (r.width && r.height) rects[sources[i].getAttribute("data-handoff")] = r;
    }
  }

  function clear(video) {
    video.style.transition = "";
    video.style.transform = "";
    video.style.transformOrigin = "";
    video.style.borderRadius = "";
    video.controls = true;
  }

  function grow(video, from) {
    var to = video.getBoundingClientRect();
    if (!to.width || !to.height || !from.width) return;

    var scale = from.width / to.width;
    var dx = from.left - to.left;
    var dy = (from.top + (from.height - to.height * scale) / 2) - to.top;

    /* Stretched controls read as a glitch mid-flight; they come back
       as soon as the video is at full size. */
    video.controls = false;

    video.style.transition = "none";
    video.style.transformOrigin = "0 0"; /* also in css, set here to be sure */
    video.style.borderRadius = "8px";    /* the card's radius */
    video.style.transform =
      "translate(" + dx + "px, " + dy + "px) scale(" + scale + ")";

    /* Flush the start state so the browser has two values to tween. */
    void video.offsetWidth;

    video.style.transition =
      "transform " + DURATION + "ms " + EASE + ", " +
      "border-radius " + DURATION + "ms " + EASE;
    video.style.transform = "translate(0px, 0px) scale(1)";
    video.style.borderRadius = "6px";

    var done = function (e) {
      if (e && e.propertyName !== "transform") return;
      video.removeEventListener("transitionend", done);
      clearTimeout(fallback);
      clear(video);
    };
    /* transitionend can be missed if the slide changes mid-flight. */
    var fallback = setTimeout(done, DURATION + 200);
    video.addEventListener("transitionend", done);
  }

  function onSlideChanged(event) {
    var slide = event.currentSlide;
    measure(slide);
    if (!slide || reduceMotion()) return;

    var video = slide.querySelector("[data-grow-from]");
    if (!video) return;

    var tag = video.getAttribute("data-grow-from");
    var from = rects[tag];
    var cameFromSource = event.previousSlide &&
      event.previousSlide.querySelector('[data-handoff="' + tag + '"]');

    if (!from || !cameFromSource) return;
    grow(video, from);
  }

  function init() {
    Reveal.on("ready", function (e) { measure(e.currentSlide); });
    Reveal.on("slidechanged", onSlideChanged);
  }

  window.DeckHandoff = { init: init };
})();
