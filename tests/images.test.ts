import { afterEach, beforeEach, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { image } from "../src/lib/server/db/schema";
import { imageByName, storeImage } from "../src/lib/server/images";
import { freshSite, SAMPLE_IMAGE } from "./helpers";

let site: ReturnType<typeof freshSite>;
beforeEach(() => {
	site = freshSite();
});
afterEach(() => site.cleanup());

const sample = () => Bun.file(SAMPLE_IMAGE).bytes();

test("stores a re-encoded WebP under its hash, with its size", async () => {
	const stored = await storeImage(await sample(), { source: "upload", alt: "x" });
	expect(stored.url).toBe(`/images/${stored.sha256}.webp`);
	expect(stored.width).toBeLessThanOrEqual(1200);
	expect(stored.height).toBeGreaterThan(0);
	expect(existsSync(join(site.dir, "images", `${stored.sha256}.webp`))).toBe(true);
});

test("the same upload twice is one file and one row", async () => {
	const a = await storeImage(await sample(), { source: "upload" });
	const b = await storeImage(await sample(), { source: "upload" });
	expect(b.id).toBe(a.id);
	expect(readdirSync(join(site.dir, "images"))).toHaveLength(1);
	expect(site.db.select().from(image).all()).toHaveLength(1);
});

test("a repo screenshot is replaced in place by name", async () => {
	site.db.$client.run("INSERT INTO project (repo, name) VALUES ('bercail', 'Bercail')");
	const first = await storeImage(await sample(), {
		source: "sync",
		project: "bercail",
		name: "dashboard",
		sourceSha: "a",
	});
	const again = await storeImage(await sample(), {
		source: "sync",
		project: "bercail",
		name: "dashboard",
		sourceSha: "b",
	});
	expect(again.id).toBe(first.id);
	expect(imageByName("bercail", "dashboard")?.sha256).toBe(first.sha256);
	expect(site.db.select().from(image).get()?.sourceSha).toBe("b");
});

test("rejects what cwebp can't read", async () => {
	await expect(
		storeImage(new TextEncoder().encode("<svg/>"), { source: "upload" }),
	).rejects.toThrow(/not an image/);
});
