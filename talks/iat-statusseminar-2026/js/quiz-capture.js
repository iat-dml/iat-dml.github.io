/* ============================================================
   Keeping the answers.

   slide-quiz stores nothing server side. The tallies live in the
   presenting tab, mirrored to sessionStorage -- which means they
   survive a reload and are gone the moment the tab closes. Seven
   questions run through the talk, and the closing ones are the list
   that seeds next year's training programme, so losing them to a closed
   tab would be a bad afternoon.

   This does two things, both entirely client side:

     1. Mirrors the results into localStorage on every vote. Unlike
        sessionStorage that outlives the tab, the browser quitting and
        the laptop restarting, so the answers are still there tomorrow
        even if nobody remembers to do anything on the day.

     2. Binds "e" to download them as a CSV. Listed in reveal's "?"
        help overlay, so it is findable mid-talk.

   Recovering them later needs no deck and no network -- see README.md,
   "Keeping the answers", for the one-line console snippet.
   ============================================================ */

window.DeckQuizCapture = (function () {
  "use strict";

  var STORE_PREFIX = "dml-quiz-";

  function storageKey() {
    return STORE_PREFIX + window.DML_QUIZ.quizGroupId;
  }

  /* results is { quizId: { votes: { answer: count }, total } }, and the
     questions carry the wording and the option labels. Flatten the two
     into rows a spreadsheet can open: one row per distinct answer. For
     the word cloud the "answer" is the text someone typed, lowercased
     and trimmed by the plugin, so identical answers arrive pre-counted.
     The plugin lists questions in deck order, so question_number is
     simply the position -- the same numbering the relay's export uses. */
  function toRows(snapshot) {
    var rows = [];
    (snapshot.questions || []).forEach(function (q, i) {
      var state = (snapshot.results || {})[q.quizId] || { votes: {}, total: 0 };
      var labels = {};
      (q.options || []).forEach(function (o) { labels[o.label] = o.text; });

      var answers = Object.keys(state.votes);
      if (!answers.length) {
        rows.push([i + 1, q.quizId, q.question, q.type, "", "", 0, state.total || 0]);
        return;
      }
      answers.sort(function (a, b) { return state.votes[b] - state.votes[a]; });
      answers.forEach(function (a) {
        rows.push([
          i + 1, q.quizId, q.question, q.type,
          a,                       // the option letter, or the typed answer
          labels[a] || "",         // the option's wording, blank for free text
          state.votes[a],
          state.total || 0
        ]);
      });
    });
    return rows;
  }

  function csvCell(v) {
    var s = String(v == null ? "" : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(snapshot) {
    var head = ["question_number", "question_id", "question", "type", "answer",
                "option_text", "votes", "question_total"];
    return [head].concat(toRows(snapshot))
      .map(function (r) { return r.map(csvCell).join(","); })
      .join("\r\n");
  }

  function download(name, text, mime) {
    var blob = new Blob(["\ufeff" + text], { type: mime + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* A visible acknowledgement, because a download that lands silently in
     a folder is indistinguishable from a keypress that did nothing. */
  function flash(message) {
    var el = document.createElement("div");
    el.className = "quiz-capture-toast";
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("is-in"); });
    setTimeout(function () {
      el.classList.remove("is-in");
      setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }

  function readSaved() {
    try {
      var raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function save(snapshot) {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(snapshot));
    } catch (e) {
      console.warn("[quiz-capture] could not save answers:", e);
    }
  }

  function snapshotFrom(presenter) {
    var s = presenter.getState();
    return {
      quizGroupId: window.DML_QUIZ.quizGroupId,
      savedAt: new Date().toISOString(),
      questions: s.questions,
      results: s.results
    };
  }

  function totalVotes(snapshot) {
    return Object.keys(snapshot.results || {}).reduce(function (n, k) {
      return n + (snapshot.results[k].total || 0);
    }, 0);
  }

  function exportNow(snapshot) {
    if (!snapshot || !totalVotes(snapshot)) {
      flash("No answers recorded yet.");
      return;
    }
    var stamp = snapshot.savedAt.slice(0, 10);
    download("dml-quiz-" + snapshot.quizGroupId + "-" + stamp + ".csv",
             toCsv(snapshot), "text/csv");
    flash("Saved " + totalVotes(snapshot) + " answers to your downloads.");
  }

  return {
    init: function () {
      var cfg = window.DML_QUIZ;

      /* Asking for the presenter when the plugin never started would
         construct a second one and set it dialling a placeholder host.
         Bind the key anyway so a previous session's answers can still be
         exported from a deck opened offline. */
      var live = cfg.wsUrl && cfg.wsUrl.indexOf("REPLACE-ME") === -1 &&
                 window.RevealSlideQuiz;

      var presenter = null;
      if (live) {
        try {
          presenter = window.RevealSlideQuiz.getQuizPresenter({
            wsUrl: cfg.wsUrl,
            quizGroupId: cfg.quizGroupId,
            endpoints: cfg.endpoints
          });
        } catch (e) {
          console.warn("[quiz-capture] no presenter to watch:", e);
        }
      }

      if (presenter) {
        /* Fires on subscribe and then on every vote. */
        presenter.store.results.subscribe(function () {
          var snap = snapshotFrom(presenter);
          if (totalVotes(snap)) save(snap);
        });
      }

      var current = function () {
        return presenter ? snapshotFrom(presenter) : readSaved();
      };

      if (window.Reveal && Reveal.addKeyBinding) {
        Reveal.addKeyBinding(
          { keyCode: 69, key: "E", description: "Export quiz answers (CSV)" },
          function () { exportNow(current()); }
        );
      }

      /* Also reachable from the console, which is how you get at answers
         from a session whose tab is long gone. */
      window.DeckQuizCapture.export = function () { exportNow(current()); };
      window.DeckQuizCapture.snapshot = current;

      var saved = readSaved();
      if (saved && totalVotes(saved)) {
        console.log("[quiz-capture] " + totalVotes(saved) +
          " answers from " + saved.savedAt + " are stored in this browser. " +
          "Press E, or run DeckQuizCapture.export(), to download them.");
      }
    }
  };
})();
