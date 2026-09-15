/* ============================================================
   Live audience quiz — shared configuration.

   Read by both the deck (js/deck.js) and the audience voting page
   (quiz.html), so nothing below is written down twice.

   The quiz is split across two hosts, on purpose:

     the deck + quiz.html   GitHub Pages, iat-dml.github.io
     the two functions      a small Netlify site, backend/

   Only the functions may hold the cable's *broadcast* credential, and
   Pages cannot run them. They are reached by absolute URL from the
   other origin; they answer the CORS preflight, so that call is the
   designed path rather than a workaround. See README.md, "Live audience
   quiz", for how both halves are deployed.

   wsUrl is the cable's WebSocket URL, from a free AnyCable Plus cable
   created with an empty application secret (public-streams mode). It is
   a client-side value by design — every phone in the room connects
   straight to it — and is the only quiz value that belongs in git.

   Leave either placeholder in and the quiz slides still draw in full
   — question, empty bars, QR code — with only the live traffic
   failing, so the deck stays safe to rehearse and to present offline.
   ============================================================ */

/* slide-quiz's UMD bundle inlines nanostores, which reads
   `process.env.NODE_ENV` unguarded to decide whether to attach its dev
   helpers. Under a bundler that expression is substituted at build
   time; loaded straight into a browser via <script> it throws
   "process is not defined" and the plugin renders nothing. A two-line
   shim is enough, and it must run before slide-quiz.umd.js -- hence
   this file's position in index.html's script order. Re-check this
   after upgrading the vendored bundle. */
window.process = window.process || { env: { NODE_ENV: "production" } };

window.DML_QUIZ = {
  /* WebSocket URL of the AnyCable Plus cable. */
  wsUrl: "wss://statuseminar-pres-chzb.fly.dev/cable",

  /* Namespaces this talk's questions on the cable. Anything unique to
     the event; changing it starts a clean slate. */
  quizGroupId: "iat-statusseminar-2026",

  /* Where the QR code on each quiz slide points. Resolved against the
     deck's own URL so it survives the move to a Pages subpath. */
  get quizUrl() {
    return new URL("quiz.html", window.location.href).href;
  },

  /* Origin of the Netlify site in backend/, with no trailing slash.
     TODO: paste it after the first `netlify deploy --prod`.

     Set it to "" to fall back to the plugin's own relative paths, which
     is what you want if the deck is ever served from that Netlify site
     itself -- `netlify dev` in backend/, say. */
  functionsOrigin: "https://dml-quiz-relay.netlify.app",

  get endpoints() {
    if (!this.functionsOrigin) return undefined;
    return {
      answer: this.functionsOrigin + "/.netlify/functions/quiz-answer",
      sync:   this.functionsOrigin + "/.netlify/functions/quiz-sync"
    };
  }
};
