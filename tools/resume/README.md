# Résumé / cover-letter sources

`resume.html` and `cover-letter.html` are the print sources for the
downloadable documents. They are intentionally **not** in `static/`
(Pages clean-URL redirects would 308 them into 404s) — only the rendered
PDFs ship.

Regenerate after any content edit:

```sh
chromium --headless --no-sandbox --disable-gpu \
  --print-to-pdf=static/resume.pdf --no-pdf-header-footer tools/resume/resume.html
chromium --headless --no-sandbox --disable-gpu \
  --print-to-pdf=static/cover-letter.pdf --no-pdf-header-footer tools/resume/cover-letter.html
```

Targets: resume = 1 page, cover letter = 1 page. Both publish
same-origin at `/resume.pdf` and `/cover-letter.pdf` on every deploy
(both mirrors). The cover letter is a per-application template —
fill the [bracketed] fields before sending.
