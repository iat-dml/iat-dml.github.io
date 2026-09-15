/**
 * Locally modified from the file slide-quiz ships in functions/netlify/.
 * Two changes: shared.mts lives in lib/ here so that Netlify does not
 * publish it as a function of its own (see lib/README.md), and the
 * question being shown is written to Netlify Blobs so the answer export
 * can carry its wording and option text (see lib/capture.mts).
 *
 * Re-apply this on any slide-quiz upgrade that touches this file.
 */
import { broadcastTo, jsonResponse, handle, SyncSchema, syncStream } from "./lib/shared.mts";
import { recordQuestion } from "./lib/capture.mts";

export default handle(
  SyncSchema,
  async ({ activeQuestionId, sessionId, quizGroupId, results, question, questionIndex, totalCount }) => {
    console.log("[quiz-sync]", { activeQuestionId, quizGroupId, questionIndex, totalCount });

    /* As in quiz-answer: the broadcast is what the room sees, so only its
       failure fails the request. A lost question record costs the export
       its wording, never the quiz. */
    const [broadcast] = await Promise.allSettled([
      broadcastTo(syncStream(quizGroupId), {
        activeQuestionId,
        sessionId,
        results,
        question,
        questionIndex,
        totalCount,
      }),
      question
        ? recordQuestion({
            quizGroupId,
            quizId: question.quizId,
            question: question.question,
            type: question.type ?? "choice",
            options: question.options ?? [],
            questionIndex,
            totalCount,
          })
        : Promise.resolve(true),
    ]);

    if (broadcast.status === "rejected") {
      console.error("[quiz-sync] broadcast failed:", broadcast.reason);
      return jsonResponse({ error: "Broadcast failed" }, 502);
    }
    console.log("[quiz-sync] broadcast ok");

    return jsonResponse({ ok: true });
  },
);
