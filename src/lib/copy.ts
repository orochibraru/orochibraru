/** Copy buttons come rendered with the HTML, so one listener serves every block in it. */
export function copyButtons(node: HTMLElement) {
	const onclick = async (event: MouseEvent) => {
		const button = (event.target as Element).closest<HTMLButtonElement>(".copy");
		const code = button?.parentElement?.querySelector("pre")?.textContent;
		if (!button || !code) {
			return;
		}
		await navigator.clipboard.writeText(code);
		button.textContent = "Copied";
		setTimeout(() => {
			button.textContent = "Copy";
		}, 1500);
	};
	node.addEventListener("click", onclick);
	return () => node.removeEventListener("click", onclick);
}

/** A heading's # copies a link to its section; the jump to it still happens. */
export function anchorLinks(node: HTMLElement) {
	const onclick = async (event: MouseEvent) => {
		const anchor = (event.target as Element).closest<HTMLAnchorElement>("a.anchor");
		if (!anchor) {
			return;
		}
		await navigator.clipboard.writeText(anchor.href);
		anchor.dataset.copied = "";
		anchor.textContent = "✓";
		setTimeout(() => {
			delete anchor.dataset.copied;
			anchor.textContent = "#";
		}, 1500);
	};
	node.addEventListener("click", onclick);
	return () => node.removeEventListener("click", onclick);
}
