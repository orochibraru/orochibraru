// Images inside rendered Markdown open full size in a modal <dialog>, which
// already brings Escape, focus trapping and the backdrop. One dialog serves the
// whole page; a click anywhere on it closes it.
let dialog: HTMLDialogElement | undefined;

function show(image: HTMLImageElement) {
	if (!dialog) {
		dialog = document.createElement("dialog");
		dialog.className = "pop lightbox";
		dialog.addEventListener("click", () => dialog?.close());
		dialog.append(document.createElement("img"));
		document.body.append(dialog);
	}
	const big = dialog.querySelector("img") as HTMLImageElement;
	// currentSrc is the file the page picked: the right theme of a <picture> or pair
	big.src = image.currentSrc || image.src;
	big.alt = image.alt;
	dialog.showModal();
}

/** Opens any image in the node that isn't already a link, including ones {@html} swaps in later. */
export function lightbox(node: HTMLElement) {
	const onclick = (event: MouseEvent) => {
		const image = (event.target as Element).closest("img");
		if (image && !image.closest("a")) {
			show(image);
		}
	};
	node.addEventListener("click", onclick);
	return () => node.removeEventListener("click", onclick);
}
