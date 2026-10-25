/** The .status modifier for any status word the admin shows. */
export function statusClass(status: string): string {
	if (status === "published" || status === "ok") {
		return "status status-on";
	}
	if (status === "failed" || status === "revoked") {
		return "status status-bad";
	}
	if (status === "running") {
		return "status status-busy";
	}
	return "status";
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 31_536_000],
	["month", 2_592_000],
	["week", 604_800],
	["day", 86_400],
	["hour", 3_600],
	["minute", 60],
];

/** "3 hours ago", "yesterday": how long since a date, at the coarsest unit that fits. */
export function ago(date: Date, now = Date.now()): string {
	const seconds = Math.round((date.getTime() - now) / 1000);
	for (const [unit, size] of STEPS) {
		if (Math.abs(seconds) >= size) {
			return relative.format(Math.round(seconds / size), unit);
		}
	}
	return "just now";
}

const HEADINGS = "h1, h2, h3, h4";

/**
 * Keeps a split view's preview pane on the part of the page the editor is showing.
 * Headings are the anchors: between two of them it interpolates, and when the two
 * sides disagree on how many there are it falls back to the whole length.
 */
export function syncScroll(container: HTMLElement) {
	let frame = 0;
	const follow = () => {
		const editor = container.querySelector<HTMLElement>(".ProseMirror");
		const pane = container.querySelector<HTMLElement>("[data-preview]");
		// the pane only scrolls on its own in the side-by-side layout
		if (!editor || !pane || getComputedStyle(pane).overflowY !== "auto") {
			return;
		}
		const paneTop = pane.getBoundingClientRect().top;
		const box = editor.getBoundingClientRect();
		let from = [...editor.querySelectorAll(HEADINGS)].map(
			(node) => node.getBoundingClientRect().top,
		);
		let to = [...pane.querySelectorAll(HEADINGS)].map(
			(node) => node.getBoundingClientRect().top - paneTop + pane.scrollTop,
		);
		if (from.length !== to.length) {
			from = [];
			to = [];
		}
		pane.scrollTop = interpolate(
			paneTop,
			[box.top, ...from, box.bottom],
			[0, ...to, pane.scrollHeight],
		);
	};
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(follow);
	};
	addEventListener("scroll", schedule, { passive: true });
	return () => {
		cancelAnimationFrame(frame);
		removeEventListener("scroll", schedule);
	};
}

/** Where `line` falls among the `from` stops, carried over onto the `to` stops. */
export function interpolate(line: number, from: number[], to: number[]): number {
	for (let index = 0; index < from.length - 1; index++) {
		const start = from[index] as number;
		const end = from[index + 1] as number;
		if (line < end || index === from.length - 2) {
			const fraction = end > start ? Math.min(Math.max((line - start) / (end - start), 0), 1) : 0;
			const target = to[index] as number;
			return target + fraction * ((to[index + 1] as number) - target);
		}
	}
	return 0;
}

/**
 * A drawer follows a finger dragging it down and closes past a short distance, as
 * a phone's sheets do. Only from its top: a drawer scrolled into its content
 * scrolls instead.
 */
export function swipeToClose(node: HTMLElement, close: () => void) {
	let start: number | undefined;
	let moved = 0;
	const down = (event: TouchEvent) => {
		start = node.scrollTop <= 0 ? event.touches[0]?.clientY : undefined;
		moved = 0;
	};
	const move = (event: TouchEvent) => {
		const y = event.touches[0]?.clientY;
		if (start === undefined || y === undefined) {
			return;
		}
		moved = Math.max(0, y - start);
		node.style.transition = "none";
		node.style.translate = `0 ${moved}px`;
	};
	const up = () => {
		if (start === undefined) {
			return;
		}
		start = undefined;
		node.style.transition = "";
		node.style.translate = "";
		if (moved > 80) {
			close();
		}
	};
	node.addEventListener("touchstart", down, { passive: true });
	node.addEventListener("touchmove", move, { passive: true });
	node.addEventListener("touchend", up);
	node.addEventListener("touchcancel", up);
	return () => {
		node.removeEventListener("touchstart", down);
		node.removeEventListener("touchmove", move);
		node.removeEventListener("touchend", up);
		node.removeEventListener("touchcancel", up);
	};
}
