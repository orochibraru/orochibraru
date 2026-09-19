import { SITE } from "$lib/seo";
import { loadPosts } from "$lib/server/posts";

const escapeXml = (text: string) => Bun.escapeHTML(text);

export const GET = async () => {
	const items = (await loadPosts())
		.map(
			(post) => `  <item>
    <title>${escapeXml(post.title)}</title>
    <link>${SITE}/blog/${post.slug}</link>
    <guid isPermaLink="true">${SITE}/blog/${post.slug}</guid>
    <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
    <description>${escapeXml(post.description)}</description>
  </item>`,
		)
		.join("\n");

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>orochibraru</title>
  <link>${SITE}/blog</link>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Free self-hosted software, and complaints about the software that isn't.</description>
  <language>en</language>
${items}
</channel>
</rss>
`,
		{ headers: { "content-type": "application/rss+xml" } },
	);
};
