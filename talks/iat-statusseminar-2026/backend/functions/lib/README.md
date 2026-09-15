# Not functions

Netlify turns every `.mts` file at the top of `functions/` into its own
endpoint. `shared.mts` and `capture.mts` are modules, not handlers, so
left up there they were published as `/.netlify/functions/shared` and
`/.netlify/functions/capture` — two URLs that answered 500 to anyone who
found them, and two extra bundles on every build.

Files in a subdirectory are not functions, so they live here instead.

`shared.mts` is upstream slide-quiz's, moved but otherwise untouched.
`quiz-answer.mts` and `quiz-sync.mts` also call into `capture.mts`, to
store each answer and each question shown; their headers say what to
re-apply on an upgrade.
`capture.mts` is ours — see `../../../README.md`, "Keeping the answers".
