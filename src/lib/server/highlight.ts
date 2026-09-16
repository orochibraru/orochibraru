// Code blocks in rendered Markdown, highlighted once at build time. Both themes'
// colours ship as CSS variables on each token and app.css picks one, so nothing
// runs in the browser except the copy button.
import { createHighlighter } from "shiki";
import { unentity } from "./markdown";

/** Every fence language the vendored guides use; anything else renders as plain text. */
const LANGS = ["bash", "dotenv", "http", "ini", "json", "nginx", "typescript", "yaml"];
const ALIASES: Record<string, string> = { env: "dotenv", sh: "bash", ts: "typescript" };

const highlighter = createHighlighter({ themes: ["github-light", "github-dark"], langs: LANGS });

export async function highlight(html: string): Promise<string> {
	const shiki = await highlighter;
	return html.replace(
		/<pre><code(?: class="language-([\w+-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
		(_block, fence: string | undefined, body: string) => {
			const lang = fence ? (ALIASES[fence] ?? fence) : "text";
			const pre = shiki.codeToHtml(unentity(body).replace(/\n$/, ""), {
				lang: LANGS.includes(lang) ? lang : "text",
				themes: { light: "github-light", dark: "github-dark" },
				defaultColor: false,
			});
			return `<div class="code">${pre}<button class="copy" type="button">Copy</button></div>`;
		},
	);
}
