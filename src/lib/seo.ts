export const SITE = "https://orochibraru.com";

export const PERSON = { "@id": `${SITE}/#person` };
export const WEBSITE = { "@id": `${SITE}/#website` };

export const breadcrumbs = (trail: [string, string][]) => ({
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	itemListElement: [["Home", "/"], ...trail].map(([name, path], index) => ({
		"@type": "ListItem",
		position: index + 1,
		name,
		item: `${SITE}${path}`,
	})),
});

// `<` escaped so a string in the data can never close the <script> it sits in
export const jsonld = (...nodes: unknown[]) =>
	nodes
		.map(
			(node) =>
				`<script type="application/ld+json">${JSON.stringify(node).replace(/</g, "\\u003c")}</script>`,
		)
		.join("\n");

/** `/` -> `/index.md`, `/blog` -> `/blog.md`. */
export const mdPath = (path: string) => (path === "/" ? "/index.md" : `${path}.md`);

/** Truncate on a word, not mid-syllable, and say so when something was cut. */
export const clip = (text: string, max: number) =>
	text.length <= max
		? text
		: `${text.slice(0, text.lastIndexOf(" ", max)).replace(/[,;:.]$/, "")}…`;

export const readable = (iso: string) =>
	new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
