/**
 * Locally modified from the file slide-quiz ships in functions/netlify/.
 * The only change is the recordAnswer() call: every vote is also written
 * to Netlify Blobs so the answers outlive the presenting browser. See
 * capture.mts, and ../../README.md under "Keeping the answers".
 *
 * Re-apply this on any slide-quiz upgrade that touches this file.
 */
import { broadcastTo, jsonResponse, handle, AnswerSchema, resultsStream } from "./lib/shared.mts";
import { recordAnswer } from "./lib/capture.mts";

export default handle(
  AnswerSchema,
  async ({ quizId, answer, sessionId, quizGroupId }) => {
    console.log("[quiz-answer]", { quizId, answer, quizGroupId });

    /* Both at once: the broadcast is what moves the bars in the room and
       must not wait on storage. Their failures are handled differently --
       a broadcast that fails is a vote the room never sees, while a
       storage failure only costs the durable copy, and failing the
       request for it would turn a logging problem into a broken quiz. */
    const [broadcast, stored] = await Promise.allSettled([
      broadcastTo(resultsStream(quizGroupId), { quizId, answer, sessionId }),
      recordAnswer({ quizGroupId, quizId, sessionId, answer }),
    ]);

    if (broadcast.status === "rejected") {
      console.error("[quiz-answer] broadcast failed:", broadcast.reason);
      return jsonResponse({ error: "Broadcast failed" }, 502);
    }
    console.log("[quiz-answer] broadcast ok");

    const saved = stored.status === "fulfilled" && stored.value === true;
    if (!saved) console.error("[quiz-answer] answer was NOT stored durably");

    return jsonResponse({ ok: true, stored: saved });
  },
);
