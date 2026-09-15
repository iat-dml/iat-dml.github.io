/**
 * Download every stored answer. Not part of upstream slide-quiz.
 *
 *   GET /.netlify/functions/quiz-export?token=...              CSV, everything
 *   GET /.netlify/functions/quiz-export?token=...&group=<id>   one talk
 *   GET /.netlify/functions/quiz-export?token=...&format=json  raw records
 *
 * Opening the CSV URL in a browser downloads a file, so recovering the
 * answers needs nothing installed and no access to the machine that
 * presented -- which is the whole reason this exists.
 *
 * The token lives in QUIZ_EXPORT_TOKEN. With it unset the endpoint
 * refuses everything: the audience's free-text answers should not be
 * enumerable by anyone who guesses the URL, and failing closed is the
 * only safe behaviour for a misconfigured deploy.
 */
import { listAnswers, listQuestions, sortAnswers, toCsv } from "./lib/capture.mts";

function deny(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Length-independent compare, so the token cannot be guessed by timing. */
function tokenMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return deny(405, "Method not allowed");

  const expected = process.env.QUIZ_EXPORT_TOKEN;
  if (!expected) {
    console.error("[quiz-export] QUIZ_EXPORT_TOKEN is not set; refusing");
    return deny(503, "Export is not configured");
  }

  const url = new URL(req.url);
  const given = url.searchParams.get("token")
    ?? (req.headers.get("authorization") ?? "").replace(/^Bearer /i, "");
  if (!given || !tokenMatches(given, expected)) return deny(401, "Unauthorized");

  const group = url.searchParams.get("group") ?? undefined;

  let rows, questions;
  try {
    [rows, questions] = await Promise.all([listAnswers(group), listQuestions(group)]);
  } catch (err) {
    console.error("[quiz-export] read failed:", err);
    return deny(502, "Could not read stored answers");
  }

  if (url.searchParams.get("format") === "json") {
    const body = {
      count: rows.length,
      questions: [...questions].sort((a, b) =>
        (a.questionIndex ?? Infinity) - (b.questionIndex ?? Infinity)),
      answers: sortAnswers(rows, questions),
    };
    return new Response(JSON.stringify(body, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `dml-quiz-${group ?? "all"}-${stamp}.csv`;
  return new Response("\ufeff" + toCsv(rows, questions), {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
};
