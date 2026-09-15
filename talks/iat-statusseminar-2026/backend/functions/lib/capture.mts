/**
 * Durable capture of every answer, independent of the presenting laptop.
 *
 * NOT part of upstream slide-quiz. The plugin keeps its tallies in the
 * presenter's browser, which is fine until someone else drives the deck
 * or the machine dies mid-talk. These helpers put a copy in Netlify
 * Blobs, written by the same function that already relays each vote.
 *
 * Key shape:  answers/<quizGroupId>/<quizId>/<sessionId>
 *
 * One blob per person per question, so a later vote from the same phone
 * *overwrites* the earlier one rather than double-counting -- the same
 * "you may change your answer while the slide is up" rule the deck
 * shows, applied to the record. It also means writes never collide:
 * nothing is ever read-modify-written, so concurrent votes cannot lose
 * each other the way appending to one growing blob would.
 *
 * What is stored is the answer exactly as typed. The word cloud
 * lowercases and merges answers to draw itself; this does not, so the
 * export keeps "Quarto" and "quarto" apart and keeps every individual
 * submission rather than only the totals.
 *
 * A vote carries only its quiz id and the answer -- for a choice
 * question that is a bare letter. So the question itself is kept too:
 *
 *   questions/<quizGroupId>/<quizId>
 *
 * written by quiz-sync from the payload the presenter already sends on
 * every slide change, overwritten each time. The export joins the two,
 * so a row reads as a question, its wording and the option chosen
 * rather than "support-reproducibility,B".
 */
import { getStore } from "@netlify/blobs";

const STORE = "quiz-answers";

export type StoredAnswer = {
  quizGroupId: string;
  quizId: string;
  sessionId: string;
  answer: string;
  submittedAt: string;
};

export type StoredQuestion = {
  quizGroupId: string;
  quizId: string;
  question: string;
  type: "choice" | "text";
  options: { label: string; text: string }[];
  /** Position in the deck, 0-based, as the presenter counts it. */
  questionIndex?: number;
  totalCount?: number;
  updatedAt: string;
};

export function answerKey(quizGroupId: string, quizId: string, sessionId: string) {
  return `answers/${quizGroupId}/${quizId}/${sessionId}`;
}

export function questionKey(quizGroupId: string, quizId: string) {
  return `questions/${quizGroupId}/${quizId}`;
}

/** Never throws, for the same reason as recordAnswer. */
export async function recordQuestion(q: Omit<StoredQuestion, "updatedAt">): Promise<boolean> {
  try {
    const store = getStore(STORE);
    const record: StoredQuestion = { ...q, updatedAt: new Date().toISOString() };
    await store.set(questionKey(q.quizGroupId, q.quizId), JSON.stringify(record));
    return true;
  } catch (err) {
    console.error("[capture] failed to store question:", err);
    return false;
  }
}

/**
 * Never throws. The audience's experience depends on the broadcast, not
 * on this, so a storage outage must degrade to "the bars still move and
 * we lost the durable copy" rather than to a failed vote.
 */
export async function recordAnswer(a: Omit<StoredAnswer, "submittedAt">): Promise<boolean> {
  try {
    const store = getStore(STORE);
    const record: StoredAnswer = { ...a, submittedAt: new Date().toISOString() };
    await store.set(answerKey(a.quizGroupId, a.quizId, a.sessionId),
                    JSON.stringify(record));
    return true;
  } catch (err) {
    console.error("[capture] failed to store answer:", err);
    return false;
  }
}

/**
 * Read back every stored answer, newest write wins per key.
 *
 * Strong consistency, because the usual moment to call this is a few
 * minutes after the talk and a stale read would quietly drop the last
 * few answers -- the opposite of the point. Reads are slower for it,
 * which does not matter here.
 */
async function readAll<T>(prefix: string): Promise<T[]> {
  const store = getStore({ name: STORE, consistency: "strong" });
  const { blobs } = await store.list({ prefix });

  const out = await Promise.all(
    blobs.map(async (b) => {
      try {
        return (await store.get(b.key, { type: "json" })) as T | null;
      } catch (err) {
        console.error("[capture] unreadable blob", b.key, err);
        return null;
      }
    }),
  );
  return out.filter((r) => r != null) as T[];
}

export async function listQuestions(quizGroupId?: string): Promise<StoredQuestion[]> {
  return readAll<StoredQuestion>(quizGroupId ? `questions/${quizGroupId}/` : "questions/");
}

/** Questions by group and id, for joining onto answers. */
function questionIndex(questions: StoredQuestion[]) {
  return new Map(questions.map((q) => [`${q.quizGroupId}/${q.quizId}`, q]));
}

/**
 * Deck order where it is known, so the export reads top to bottom the
 * way the talk ran; answers to a question never synced sort after, by id.
 */
export function sortAnswers(rows: StoredAnswer[], questions: StoredQuestion[]): StoredAnswer[] {
  const byId = questionIndex(questions);
  const pos = (r: StoredAnswer) => byId.get(`${r.quizGroupId}/${r.quizId}`)?.questionIndex ?? Infinity;
  return [...rows].sort((a, b) =>
    a.quizGroupId.localeCompare(b.quizGroupId) ||
    pos(a) - pos(b) ||
    a.quizId.localeCompare(b.quizId) ||
    a.submittedAt.localeCompare(b.submittedAt));
}

export async function listAnswers(quizGroupId?: string): Promise<StoredAnswer[]> {
  return readAll<StoredAnswer>(quizGroupId ? `answers/${quizGroupId}/` : "answers/");
}

export function toCsv(rows: StoredAnswer[], questions: StoredQuestion[] = []): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const byId = questionIndex(questions);
  const head = ["quiz_group_id", "question_number", "quiz_id", "question", "type",
                "answer", "option_text", "session_id", "submitted_at"];
  const lines = sortAnswers(rows, questions).map((r) => {
    const q = byId.get(`${r.quizGroupId}/${r.quizId}`);
    const option = q?.options.find((o) => o.label === r.answer)?.text ?? "";
    return [
      r.quizGroupId,
      q?.questionIndex != null && q.questionIndex >= 0 ? q.questionIndex + 1 : "",
      r.quizId,
      q?.question ?? "",
      q?.type ?? "",
      r.answer,
      option,
      r.sessionId,
      r.submittedAt,
    ].map(cell).join(",");
  });
  return [head.join(","), ...lines].join("\r\n");
}
