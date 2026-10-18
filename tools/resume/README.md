# Résumé / cover-letter sources

Two different pipelines here, on purpose.

## `resume.pdf` — generated

Content lives in `src/lib/data/resume.ts` and is rendered two ways from
that one module: the live page at `/resume`, and the PDF via:

```sh
npm run resume
```

`build.ts` writes a standalone print document (no nav, footer, or theme
switcher) and renders it with headless Chrome, falling back to
`weasyprint` if Chrome isn't on PATH. CI runs this before every build, so
the download button can never disagree with the page.

That matters because the PDF used to be a hand-maintained binary that
nobody regenerated — it kept advertising a 3.9 GPA and 50 credits after
neither was true. A generated artifact can't drift that way.

No volatile values in `resume.ts` (GPA, credits earned, semesters
remaining). Those change every term and were the original failure.

## `cover-letter.html` — hand-maintained

A letter is per-application prose, so it stays hand-written rather than
generated from structured data.

```sh
chromium --headless --no-sandbox --disable-gpu \
  --print-to-pdf=static/cover-letter.pdf --no-pdf-header-footer tools/resume/cover-letter.html
```

Targets: both documents are 1 page. Both publish same-origin at
`/resume.pdf` and `/cover-letter.pdf` on every deploy.

Neither source lives in `static/` — Pages clean-URL redirects would 308
them into 404s. Only the rendered PDFs ship.
