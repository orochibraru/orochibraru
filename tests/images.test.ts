import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { image } from "../src/lib/server/db/schema";
import { imageByName, imageSize, recordScreenshot, screenshotWebp } from "../src/lib/server/images";
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

test("a screenshot is a row, replaced in place by name, served under its blob sha", () => {
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
		url: "/images/b.webp",
	});
	expect(imageByName("bercail", "graphics/dashboard", "canary")).toBeUndefined();
});

const SHA = "0123456789abcdef0123456789abcdef01234567";

function recordPng() {
	site.db.$client.run("INSERT INTO project (repo, name) VALUES ('bercail', 'Bercail')");
	recordScreenshot(
		{ width: 1200, height: 1541 },
		{
			project: "bercail",
			channel: "latest",
			name: "hero",
			sourceSha: SHA,
			url: "https://raw.githubusercontent.com/me/bercail/main/docs/images/hero.png",
		},
	);
}

test("a screenshot is fetched once, re-encoded to WebP, then served from the cache", async () => {
	recordPng();
	const png = await new Bun.Image(await Bun.file(SAMPLE_IMAGE).bytes()).png().blob();
	const github = spyOn(globalThis, "fetch").mockResolvedValue(new Response(png));
	try {
		for (let request = 0; request < 2; request++) {
			const webp = await screenshotWebp(SHA);
			expect(webp).toBeDefined();
			const format = (await new Bun.Image(await (webp as Blob).bytes()).metadata()).format;
			expect(format).toBe("webp");
		}
		expect(github).toHaveBeenCalledTimes(1);
	} finally {
		github.mockRestore();
	}
});

test("an unknown sha, or anything but a sha, is not found without asking GitHub", async () => {
	recordPng();
	const github = spyOn(globalThis, "fetch");
	try {
		expect(await screenshotWebp("f".repeat(40))).toBeUndefined();
		expect(await screenshotWebp(`../../${SHA}`)).toBeUndefined();
		expect(github).not.toHaveBeenCalled();
	} finally {
		github.mockRestore();
	}
});

test("a GitHub failure throws and caches nothing", async () => {
	recordPng();
	const github = spyOn(globalThis, "fetch").mockResolvedValue(
		new Response("gone", { status: 404 }),
	);
	try {
		await expect(screenshotWebp(SHA)).rejects.toThrow("GitHub answered 404");
		await expect(screenshotWebp(SHA)).rejects.toThrow();
		expect(github).toHaveBeenCalledTimes(2);
	} finally {
		github.mockRestore();
	}
});
