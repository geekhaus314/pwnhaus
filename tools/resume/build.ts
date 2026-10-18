/**
 * Generates static/resume.pdf from src/lib/data/resume.ts.
 *
 * Why this exists: the PDF used to be a hand-maintained binary that
 * silently drifted from reality — it advertised a 3.9 GPA and 50 credits
 * after neither was true, because nothing regenerated it. Rendering it
 * from the same module that drives /resume means the download button can
 * never disagree with the page.
 *
 * Standalone print document: no nav, no footer, no theme switcher. The
 * browser view gets those; a PDF should not.
 *
 *   npm run resume
 */

import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	resumeContact,
	resumeEducation,
	resumeExperience,
	resumeProjects,
	resumeSkills,
	resumeSummary
} from '../../src/lib/data/resume.ts';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../static/resume.pdf');

const esc = (s: string): string =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(resumeContact.name)} — Resume</title>
<style>
  @page { size: Letter; margin: 0.3in 0.45in; }
  * { box-sizing: border-box; }
  body { font: 8.6pt/1.25 Helvetica, Arial, sans-serif; color: #111; margin: 0; }
  header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
  header h1 { font-size: 17pt; margin: 0; letter-spacing: .5px; }
  header p.role { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; margin: 3px 0 0; color: #333; }
  header p.contact { font-size: 8.2pt; margin: 3px 0 0; color: #333; }
  section { margin-bottom: 5px; }
  h2 { font-size: 9.5pt; text-transform: uppercase; letter-spacing: 1.3px;
       border-bottom: 1px solid #999; padding-bottom: 1px; margin: 0 0 3px; }
  p { margin: 0 0 3px; }
  .entry { margin-bottom: 4px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .head strong { font-size: 9.2pt; }
  .head span { font-size: 8.2pt; color: #444; white-space: nowrap; }
  .org { margin: 1px 0 2px; font-size: 8.2pt; color: #555; }
  ul { margin: 2px 0 0 15px; padding: 0; }
  li { margin-bottom: 0; }
  .skills { display: grid; grid-template-columns: 100px 1fr; gap: 1px 8px; font-size: 8.6pt; margin: 0; }
  .skills dt { font-weight: bold; }
  .skills dd { margin: 0; }
</style></head>
<body>
<header>
  <h1>${esc(resumeContact.name)}</h1>
  <p class="role">IT Support &amp; Networking — Computer Science Student</p>
  <p class="contact">${esc(resumeContact.location)} &nbsp;|&nbsp; ${esc(resumeContact.phone)}
     &nbsp;|&nbsp; ${esc(resumeContact.email)}<br>
     ${esc(resumeContact.github)} &nbsp;|&nbsp; ${esc(resumeContact.portfolio)}</p>
</header>

<section><h2>Summary</h2><p>${esc(resumeSummary)}</p></section>

<section><h2>Core Competencies</h2>
<dl class="skills">
${resumeSkills.map((s) => `  <dt>${esc(s.label)}</dt><dd>${esc(s.items)}</dd>`).join('\n')}
</dl></section>

<section><h2>Education</h2>
${resumeEducation
	.map(
		(e) => `<div class="entry">
  <div class="head"><strong>${esc(e.degree)}</strong><span>${esc(e.when)}</span></div>
  <p class="org">${esc(e.school)}</p>
  <p>${esc(e.detail)}</p>
</div>`
	)
	.join('\n')}
</section>

<section><h2>Experience</h2>
${resumeExperience
	.map(
		(j) => `<div class="entry">
  <div class="head"><strong>${esc(j.role)}</strong><span>${esc(j.when)}</span></div>
  <p class="org">${esc(j.org)}</p>
  <ul>
${j.points.map((p) => `    <li>${esc(p)}</li>`).join('\n')}
  </ul>
</div>`
	)
	.join('\n')}
</section>

<section><h2>Projects</h2>
${resumeProjects
	.map(
		(p) => `<div class="entry">
  <div class="head"><strong>${esc(p.name)}</strong>${p.live ? `<span>${esc(p.live)}</span>` : ''}</div>
  <p class="org">${esc(p.tech)}</p>
  <ul>
${p.points.map((pt) => `    <li>${esc(pt)}</li>`).join('\n')}
  </ul>
</div>`
	)
	.join('\n')}
</section>
</body></html>
`;

const dir = mkdtempSync(join(tmpdir(), 'resume-'));
const src = join(dir, 'resume.html');
try {
	writeFileSync(src, html);

	// Chrome is preinstalled on GitHub's ubuntu runners and present locally;
	// fall back to weasyprint for anyone without it.
	const chrome = [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser'].find(
		(bin) => {
			if (!bin) return false;
			try {
				execFileSync(bin, ['--version'], { stdio: 'ignore' });
				return true;
			} catch {
				return false;
			}
		}
	);

	if (chrome) {
		execFileSync(
			chrome,
			[
				'--headless',
				'--disable-gpu',
				'--no-sandbox',
				'--no-pdf-header-footer',
				`--print-to-pdf=${out}`,
				`file://${src}`
			],
			{ stdio: 'inherit' }
		);
	} else {
		execFileSync('weasyprint', [src, out], { stdio: 'inherit' });
		console.log('chrome not found — fell back to weasyprint');
	}
	console.log(`wrote ${out}`);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
