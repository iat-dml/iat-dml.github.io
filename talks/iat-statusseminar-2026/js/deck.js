/* ============================================================
   Deck boot.

   Config mirrors the settings the DML Quarto extension used, so this
   deck looks and behaves like the others in presentations/:
   see presentations/cdp-27052026/_extensions/dml/_extension.yml
   ============================================================ */

Reveal.initialize({
  width: 1280,
  height: 720,
  margin: 0.04,

  controls: false,
  progress: true,
  slideNumber: "c/t",
  hash: true,
  fragmentInURL: true,

  /* Slide transitions stay off; the diagram's own motion carries the
     deck, and a competing slide slide/fade reads as noise next to it.
     Individual slides opt in with data-transition (the video handoff
     uses fade). */
  transition: "none",
  backgroundTransition: "fade",

  /* No vertical stacks in this deck, so down-arrow should advance
     rather than dead-end. */
  navigationMode: "linear",

  /* Keep each fragment state on its own PDF page. */
  pdfSeparateFragments: false,

  plugins: [RevealMarkdown, RevealNotes, RevealHighlight]
}).then(function () {
  DeckDirector.init();
  DeckHandoff.init();

  /* T flips between the DML and IAT themes. A reload rather than a live
     swap: the strata diagram reads its colours and fonts once, at mount.
     The hash keeps the current slide. */
  Reveal.addKeyBinding(
    { keyCode: 84, key: "T", description: "Switch theme (DML / IAT)" },
    function () {
      var url = new URL(window.location.href);
      if (document.documentElement.getAttribute("data-theme") === "iat") {
        url.searchParams.delete("theme");
      } else {
        url.searchParams.set("theme", "iat");
      }
      window.location.replace(url.href);
    }
  );
});
