// Code blocks in rendered Markdown, highlighted once at build time. Both themes'
// colours ship as CSS variables on each token and app.css picks one, so nothing
// runs in the browser except the copy button.
import { createHighlighter } from "shiki";
import { unentity } from "./markdown";

/** Every fence language we highlight; anything else renders as plain text. */
const LANGS = [
	"bash",
	"dockerfile",
	"dotenv",
	"go",
	"http",
	"ini",
	"javascript",
	"json",
	"nginx",
	"python",
	"rust",
	"typescript",
	"yaml",
];
const ALIASES: Record<string, string> = {
	docker: "dockerfile",
	env: "dotenv",
	golang: "go",
	js: "javascript",
	py: "python",
	rs: "rust",
	sh: "bash",
	ts: "typescript",
	yml: "yaml",
};

const highlighter = createHighlighter({ themes: ["github-light", "github-dark"], langs: LANGS });

export async function highlight(html: string): Promise<string> {
	const shiki = await highlighter;
	return html.replace(
		/<pre><code(?: class="language-([\w+-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
		(_block, fence: string | undefined, body: string) => {
			// drawn in the browser by $lib/mermaid; the escaped source is its no-JS fallback
			if (fence === "mermaid") {
				return `<pre class="mermaid">${body.replace(/\n$/, "")}</pre>`;
			}
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
