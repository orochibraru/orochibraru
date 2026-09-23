import { expect, test } from "bun:test";
import { layout } from "../src/lib/components/admin/project-layout";

test("a run of tiles sits two across, and an odd run gets a spacer", () => {
	const { classes, spacers } = layout(["h2", "h3", "p", "h3", "p", "h3", "p", "p"]);
	expect(classes).toEqual([
		"ruled",
		"cell cell-a tile-head run-start",
		"cell cell-a tile-body",
		"cell cell-b tile-head run-start",
		"cell cell-b tile-body",
		"cell cell-a tile-head",
		"cell cell-a tile-body",
		"",
	]);
	expect(spacers).toEqual([{ after: 6, tall: true }]);
});

test("a lone screenshot spans the width, and a ### over a code block is a label", () => {
	const { classes, spacers } = layout(["p", "h2", "shot", "h2", "h3", "other"]);
	expect(classes).toEqual(["lede", "ruled", "cell cell-solo shot run-start", "", "label", ""]);
	expect(spacers).toEqual([]);
});
