// The editor's copy of the project page layout in project-pages.ts. The server
// regroups the Markdown into tiles, screenshots and ruled sections when it renders;
// here the same decisions become classes on the editor's blocks (ProseMirror
// decorations, so the document itself is untouched) and CSS lays them out.
import type { Node } from "@milkdown/kit/prose/model";
import { Plugin } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

export type Block = "h2" | "h3" | "p" | "shot" | "other";
export type Layout = { classes: string[]; spacers: { after: number; tall: boolean }[] };

/**
 * The class each top-level block gets. A tile is a ### with the paragraph under it;
 * a screenshot is a paragraph that opens with an image. A run of either is a grid,
 * two across; an odd run gets a spacer so nothing later backfills its empty cell.
 */
export function layout(blocks: Block[]): Layout {
	const classes = blocks.map(() => "");
	const spacers: Layout["spacers"] = [];
	const add = (index: number, name: string) => {
		classes[index] = `${classes[index]} ${name}`.trim();
	};

	let run: { first: number; tile: boolean }[] = [];
	const close = () => {
		run.forEach((cell, position) => {
			const column = run.length === 1 ? "cell-solo" : position % 2 ? "cell-b" : "cell-a";
			const parts = cell.tile ? ["tile-head", "tile-body"] : ["shot"];
			parts.forEach((part, offset) => {
				add(cell.first + offset, `cell ${column} ${part}`);
				if (position < 2 && offset === 0) {
					add(cell.first, "run-start");
				}
			});
		});
		const last = run.at(-1);
		if (last && run.length > 1 && run.length % 2) {
			spacers.push({ after: last.first + (last.tile ? 1 : 0), tall: last.tile });
		}
		run = [];
	};
	for (let index = 0; index < blocks.length; index++) {
		const block = blocks[index];
		if (block === "shot") {
			run.push({ first: index, tile: false });
		} else if (block === "h3" && blocks[index + 1] === "p") {
			run.push({ first: index, tile: true });
			index++;
		} else {
			close();
			if (block === "h3") {
				add(index, "label");
			}
		}
	}
	close();

	// a section's heading runs a rule out to the edge when the section holds a grid
	let heading = -1;
	blocks.forEach((block, index) => {
		if (block === "h2") {
			heading = index;
		} else if (
			heading >= 0 &&
			classes[index]?.includes("cell") &&
			!classes[heading]?.includes("ruled")
		) {
			add(heading, "ruled");
		}
	});
	if (blocks[0] === "p") {
		add(0, "lede");
	}
	return { classes, spacers };
}

function blockOf(node: Node): Block {
	const type = node.type.name;
	if (type === "heading") {
		return node.attrs.level === 2 ? "h2" : node.attrs.level === 3 ? "h3" : "other";
	}
	if (type === "image-block") {
		return "shot";
	}
	if (type === "paragraph") {
		return node.firstChild?.type.name === "image" ? "shot" : "p";
	}
	return "other";
}

function decorate(doc: Node): DecorationSet {
	const nodes: { node: Node; offset: number }[] = [];
	doc.forEach((node, offset) => {
		nodes.push({ node, offset });
	});
	const { classes, spacers } = layout(nodes.map(({ node }) => blockOf(node)));
	const decorations = nodes.flatMap(({ node, offset }, index) =>
		classes[index]
			? [Decoration.node(offset, offset + node.nodeSize, { class: classes[index] })]
			: [],
	);
	for (const { after, tall } of spacers) {
		const entry = nodes[after];
		if (!entry) {
			continue;
		}
		const spacer = () => {
			const element = document.createElement("div");
			element.className = `cell cell-b spacer${tall ? " tall" : ""}`;
			return element;
		};
		decorations.push(
			Decoration.widget(entry.offset + entry.node.nodeSize, spacer, {
				side: -1,
				key: `spacer-${tall}`,
				ignoreSelection: true,
			}),
		);
	}
	return DecorationSet.create(doc, decorations);
}

/** A fresh Milkdown plugin for each editor instance. */
export const projectLayout = () =>
	$prose(
		() =>
			new Plugin<DecorationSet>({
				state: {
					init: (_config, state) => decorate(state.doc),
					apply: (transaction, set) => (transaction.docChanged ? decorate(transaction.doc) : set),
				},
				props: {
					decorations(state) {
						return this.getState(state);
					},
				},
			}),
	);
