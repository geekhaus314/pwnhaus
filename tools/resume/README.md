# Résumé / CV sources

`resume.html` and `cv.html` are the print sources for the downloadable
documents. They are intentionally **not** in `static/` (Pages clean-URL
redirects would 308 them into 404s) — only the rendered PDFs ship.

Regenerate after any content edit:

```sh
chromium --headless --no-sandbox --disable-gpu \
  --print-to-pdf=static/resume.pdf --no-pdf-header-footer tools/resume/resume.html
chromium --headless --no-sandbox --disable-gpu \
  --print-to-pdf=static/cv.pdf --no-pdf-header-footer tools/resume/cv.html
```

Targets: resume = 1 page, CV = 2 pages. Both publish same-origin at
`/resume.pdf` and `/cv.pdf` on every deploy (both mirrors).
