import { afterEach, beforeEach, expect, test } from "bun:test";
import { image } from "../src/lib/server/db/schema";
import { imageByName, imageSize, recordScreenshot } from "../src/lib/server/images";
import { freshSite, SAMPLE_IMAGE } from "./helpers";

let site: ReturnType<typeof freshSite>;
beforeEach(() => {
	site = freshSite();
});
afterEach(() => site.cleanup());

const pad = (head: number[]) => Uint8Array.from([...head, ...new Array(32).fill(0)]);

test("measures a WebP, a PNG and a JPEG from their headers", async () => {
	expect(imageSize(await Bun.file(SAMPLE_IMAGE).bytes())).toEqual({ width: 1200, height: 1541 });
	// signature, then IHDR: length, type, width 1600, height 900
	const png = pad([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 6,
		0x40, 0, 0, 3, 0x84,
	]);
	expect(imageSize(png)).toEqual({ width: 1600, height: 900 });
	// SOI, an APP0 to skip over, then SOF2 (progressive): 8 bits, height 480, width 640
	const jpeg = pad([
		0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc2, 0, 17, 8, 0x01, 0xe0, 0x02, 0x80,
	]);
	expect(imageSize(jpeg)).toEqual({ width: 640, height: 480 });
	expect(
		imageSize(new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"/>`)),
	).toBeNull();
});

test("a screenshot is a row, replaced in place by name, served from its GitHub URL", () => {
	site.db.$client.run("INSERT INTO project (repo, name) VALUES ('bercail', 'Bercail')");
	const shot = (sourceSha: string) =>
		({
			project: "bercail",
			channel: "latest",
			name: "graphics/dashboard",
			sourceSha,
			url: `https://raw.githubusercontent.com/me/bercail/${sourceSha}/docs/images/graphics/dashboard.png`,
		}) as const;
	recordScreenshot({ width: 1600, height: 900 }, shot("a"));
	recordScreenshot({ width: 1280, height: 720 }, shot("b"));
	expect(site.db.select().from(image).all()).toHaveLength(1);
	expect(imageByName("bercail", "graphics/dashboard")).toEqual({
		width: 1280,
		height: 720,
		url: "https://raw.githubusercontent.com/me/bercail/b/docs/images/graphics/dashboard.png",
	});
	expect(imageByName("bercail", "graphics/dashboard", "canary")).toBeUndefined();
});
