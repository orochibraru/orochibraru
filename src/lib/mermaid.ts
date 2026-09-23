// ```mermaid fences come from the server as <pre class="mermaid"> holding the
// source, so a page without JS still shows it. Here they become SVG, and are
// drawn again whenever the theme flips. Mermaid is loaded only when a page has one.
let count = 0;

export const dark = () => {
	const theme = document.documentElement.dataset.theme;
	return theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

async function draw(blocks: HTMLElement[]) {
	if (!blocks.length) {
		return;
	}
	const { default: mermaid } = await import("mermaid");
	mermaid.initialize({ startOnLoad: false, theme: dark() ? "dark" : "default" });
	for (const block of blocks) {
		block.dataset.source ??= block.textContent ?? "";
		try {
			const { svg } = await mermaid.render(`mermaid-${count++}`, block.dataset.source);
			block.innerHTML = svg;
		} catch {
			// a diagram that doesn't parse stays readable as its source
			block.textContent = block.dataset.source;
		}
	}
}

/** Renders every Mermaid block in the node, including ones {@html} swaps in later. */
export function mermaidDiagrams(node: HTMLElement) {
	const all = () => [...node.querySelectorAll<HTMLElement>("pre.mermaid")];
	const redraw = () => draw(all());
	draw(all());

	// the admin preview replaces its HTML on every keystroke: only draw what's new
	const content = new MutationObserver(() => draw(all().filter((b) => !b.dataset.source)));
	content.observe(node, { childList: true, subtree: true });
	const theme = new MutationObserver(redraw);
	theme.observe(document.documentElement, { attributeFilter: ["data-theme"] });
	const system = matchMedia("(prefers-color-scheme: dark)");
	system.addEventListener("change", redraw);

	return () => {
		content.disconnect();
		theme.disconnect();
		system.removeEventListener("change", redraw);
	};
}
