import { describe, expect, test } from "bun:test";
import { highlight } from "../src/lib/server/highlight";
import { markdown } from "../src/lib/server/markdown";

describe("mermaid fences", () => {
	const html = Bun.markdown.html("```mermaid\ngraph TD\n  A --> B\n```\n");

	test("skip Shiki and keep the escaped source for the browser", async () => {
		const out = await highlight(html);
		expect(out).toBe('<pre class="mermaid">graph TD\n  A --&gt; B</pre>\n');
	});

	test("come back as a mermaid fence in the Markdown twin", async () => {
		expect(markdown(await highlight(html))).toBe("```mermaid\ngraph TD\n  A --> B\n```\n");
	});

	test("leave other fences highlighted and untagged in the twin", async () => {
		const out = await highlight(Bun.markdown.html("```ts\nconst a = 1;\n```\n"));
		expect(out).toContain('class="shiki');
		expect(markdown(out)).toBe("```\nconst a = 1;\n```\n");
	});
});
