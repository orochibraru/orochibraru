import { SITE } from "$lib/seo";
import { allDocs, twin } from "$lib/server/documents";

export const prerender = true;

export const GET = async ({ fetch }) => {
	const docs = await allDocs(fetch);
	return new Response(
		"# orochibraru.com — the whole site, as Markdown\n\n" +
			`Generated ${new Date().toISOString().slice(0, 10)}. Index: ${SITE}/llms.txt\n\n` +
			docs.map((doc) => `---\n\n${twin(doc)}`).join("\n\n") +
			"\n",
	);
};
