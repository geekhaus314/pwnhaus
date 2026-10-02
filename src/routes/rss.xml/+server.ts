import { posts } from '$lib/data/posts';
import type { RequestHandler } from './$types';

export const prerender = true;

const SITE = 'https://pwn4g3.pages.dev';
const FEED_TITLE = 'pwn4g3 — Jake Viefhaus';
const FEED_DESC =
	'Full-stack development and security engineering — case studies, pricing breakdowns, and build notes from Jake Viefhaus.';

const escapeXml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

const pubDate = (iso: string): string => new Date(`${iso}T00:00:00Z`).toUTCString();

export const GET: RequestHandler = () => {
	const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
	const latest = sorted[0];

	const items = sorted
		.map(
			(post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${post.slug}</guid>
      <pubDate>${pubDate(post.date)}</pubDate>${post.updated ? `\n      <atom:updated>${pubDate(post.updated)}</atom:updated>` : ''}
      <description>${escapeXml(post.excerpt)}</description>
${post.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join('\n')}
      <content:encoded><![CDATA[${post.body.trim()}]]></content:encoded>
    </item>`
		)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${SITE}</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESC)}</description>
    <language>en-us</language>${latest ? `\n    <lastBuildDate>${pubDate(latest.date)}</lastBuildDate>` : ''}
${items}
  </channel>
</rss>
`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
