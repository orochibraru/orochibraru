const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	shy: "",
	rsquo: "’",
	lsquo: "‘",
	ldquo: "“",
	rdquo: "”",
	mdash: "—",
	ndash: "–",
	hellip: "…",
	middot: "·",
	larr: "←",
	rarr: "→",
	times: "×",
	copy: "©",
	deg: "°",
};

export const unentity = (s: string) =>
	s
		.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
		.replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);

/** The inline content of a tag, markup already converted, flattened to one line. */
const flat = (s: string) =>
	s
		.replace(/<[^>]+>/g, "")
		.replace(/\s+/g, " ")
		.trim();

/**
 * The <main> of one of our own pages, as Markdown. Not a general-purpose
 * converter: it only knows the handful of tags these pages actually use.
 */
export function markdown(html: string): string {
	const pre: string[] = [];
	let s = (html.match(/<main[^>]*>([\s\S]*)<\/main>/i)?.[1] ?? html)
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, "")
		.replace(/<button\b[\s\S]*?<\/button>/gi, "")
		// <pre> is stashed whole: its whitespace has to survive the tidying below.
		.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, body: string) => {
			pre.push(unentity(body.replace(/<[^>]+>/g, "")).replace(/^\n+|\s+$/g, ""));
			return `\n\n@@PRE${pre.length - 1}@@\n\n`;
		});

	s = s
		// a <picture> keeps only its fallback <img>: the <source>s are the same shot
		.replace(/<source\b[^>]*>/gi, "")
		.replace(/<img\b[^>]*>/gi, (tag: string) => {
			const src = tag.match(/\bsrc="([^"]*)"/i)?.[1];
			const alt = tag.match(/\balt="([^"]*)"/i)?.[1] ?? "";
			return src ? `\n\n![${unentity(alt)}](${src})\n\n` : "";
		})
		.replace(
			/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
			(_m, href: string, inner: string) => {
				// a card is an <a> wrapped around a whole block: keep its structure and
				// put the destination underneath, rather than mashing it into one link.
				if (/<(h[1-6]|p|div|ul|ol)\b/i.test(inner)) {
					return `${inner}\n\n[More &rarr;](${href})\n\n`;
				}
				const text = flat(inner);
				return text ? `[${text}](${href})` : "";
			},
		)
		.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, t: string) => `\`${flat(t)}\``)
		.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t: string) => {
			const text = flat(t);
			return text ? `**${text}**` : "";
		})
		.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, t: string) => {
			const text = flat(t);
			return text ? `*${text}*` : "";
		})
		.replace(/<br\s*\/?>/gi, " ")
		.replace(
			/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
			(_m, level: string, t: string) => `\n\n${"#".repeat(Number(level))} ${flat(t)}\n\n`,
		)
		.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t: string) => `\n- ${flat(t)}`)
		.replace(
			/<\/(p|div|section|article|ul|ol|figure|figcaption|blockquote|header|footer|main)>/gi,
			"\n\n",
		)
		.replace(/<[^>]+>/g, "");

	return `${unentity(s)
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
		// only now, so none of the tidying above could reach inside a code block
		.replace(/@@PRE(\d+)@@/g, (_m, i: string) => `\`\`\`\n${pre[Number(i)]}\n\`\`\``)}\n`;
}

/** Rendered Markdown's links to other sites open in a new tab, like every external link on the site. */
export const externalLinks = (html: string) =>
	html.replace(/<a href="(https?:[^"]*)"/g, '<a href="$1" target="_blank" rel="noopener"');

export const titleOf = (html: string) =>
	unentity(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
export const descriptionOf = (html: string) =>
	unentity(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] ?? "").trim();
