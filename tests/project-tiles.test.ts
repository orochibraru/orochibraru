import { expect, test } from "bun:test";
import { tiles } from "../src/lib/server/project-pages";

const noImages = () => undefined;

test("a ### over a code block stays a label, even with a tile further down", () => {
	// Penombre's "Run it": two labelled code blocks, then a real ### + paragraph tile
	const html = [
		"<h3>Docker run</h3>",
		"<pre><code>docker run</code></pre>",
		"<h3>Docker Compose</h3>",
		"<pre><code>services:</code></pre>",
		"<p>Either way it comes up</p>",
		"<h3>The apps</h3>",
		"<p>The server needs nothing extra.</p>",
		"<pre><code>brew install</code></pre>",
	].join("\n");

	const out = tiles(html, noImages, false);

	// only the real tile is a tile
	expect(out.match(/class="feat"/g)).toHaveLength(1);
	expect(out).toContain('<div class="feat"><h3>The apps</h3>');
	// the labels and their code blocks stay outside any grid
	expect(out).toContain("<h3>Docker run</h3>\n<pre>");
	expect(out).toContain("<h3>Docker Compose</h3>\n<pre>");
	expect(out.indexOf('class="tiles"')).toBeGreaterThan(out.indexOf("Either way"));
});
