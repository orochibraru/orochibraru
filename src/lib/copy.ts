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
