// Repo screenshots stay on GitHub: the site keeps only a row per screenshot, with
// its size for the <img> and the raw.githubusercontent.com URL it is fetched from.
// Pages point at /images/<blob sha>.webp, re-encoded on first request and cached.
import { rename } from "node:fs/promises";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { getDataDir, getDb } from "./db";
import { type Channel, image } from "./db/schema";

export type Size = { width: number; height: number };
export type Image = Size & { url: string };

/**
 * Width and height straight out of a PNG, JPEG or WebP header, so a screenshot
 * can be measured without decoding it. Anything else gets null rather than a guess.
 */
export function imageSize(bytes: Uint8Array): Size | null {
	if (bytes.length < 30) {
		return null;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
	if (ascii(1, 4) === "PNG") {
		return { width: view.getUint32(16), height: view.getUint32(20) };
	}
	if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
		const fourCC = ascii(12, 16);
		if (fourCC === "VP8 ") {
			return {
				width: view.getUint16(26, true) & 0x3fff,
				height: view.getUint16(28, true) & 0x3fff,
			};
		}
		if (fourCC === "VP8L") {
			const bits = view.getUint32(21, true);
			return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
		}
		if (fourCC === "VP8X") {
			const read24 = (at: number) =>
				view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getUint8(at + 2) << 16);
			return { width: read24(24) + 1, height: read24(27) + 1 };
		}
		return null;
	}
	if (view.getUint16(0) === 0xffd8) {
		// walk the segments to the first start-of-frame: every SOFn but DHT, JPG and DAC
		for (let at = 2; at + 9 < bytes.length; at += 2 + view.getUint16(at + 2)) {
			const marker = view.getUint16(at);
			if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
				return { width: view.getUint16(at + 7), height: view.getUint16(at + 5) };
			}
		}
	}
	return null;
}

export type Screenshot = {
	project: string;
	channel: Channel;
	name: string;
	sourceSha: string;
	url: string;
};

type Writer = Pick<ReturnType<typeof getDb>, "insert">;

/** A repo screenshot's row, by (project, channel, name). */
export function recordScreenshot(size: Size, shot: Screenshot, db: Writer = getDb()) {
	db.insert(image)
		.values({ ...size, ...shot })
		.onConflictDoUpdate({
			target: [image.project, image.channel, image.name],
			set: { ...size, sourceSha: shot.sourceSha, url: shot.url },
		})
		.run();
}

/** Where the site serves a screenshot: the blob sha is its content, so the URL never goes stale. */
export const imageUrl = (sourceSha: string) => `/images/${sourceSha}.webp`;

export function imageByName(
	project: string,
	name: string,
	channel: Channel = "latest",
): Image | undefined {
	const row = getDb()
		.select({ width: image.width, height: image.height, sourceSha: image.sourceSha })
		.from(image)
		.where(and(eq(image.project, project), eq(image.channel, channel), eq(image.name, name)))
		.get();
	return row && { width: row.width, height: row.height, url: imageUrl(row.sourceSha) };
}

/**
 * A screenshot as WebP, by blob sha: fetched from GitHub and re-encoded the first
 * time, then read from DATA_DIR/cache. Undefined when no screenshot has that sha.
 */
export async function screenshotWebp(sourceSha: string): Promise<Blob | undefined> {
	// it names a file below: a sha1 or sha256 blob id and nothing else
	if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sourceSha)) {
		return undefined;
	}
	const path = join(getDataDir(), "cache", "images", `${sourceSha}.webp`);
	if (await Bun.file(path).exists()) {
		return Bun.file(path);
	}
	const row = getDb()
		.select({ url: image.url })
		.from(image)
		.where(eq(image.sourceSha, sourceSha))
		.get();
	if (!row) {
		return undefined;
	}
	const response = await fetch(row.url, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) {
		throw new Error(`${row.url}: GitHub answered ${response.status}`);
	}
	const bytes = await response.bytes();
	const webp =
		(await new Bun.Image(bytes).metadata()).format === "webp"
			? bytes
			: await new Bun.Image(bytes).webp({ quality: 80 }).bytes();
	// written aside, then renamed: a request racing this one never reads half a file
	const partial = `${path}.${crypto.randomUUID()}`;
	await Bun.write(partial, webp);
	await rename(partial, path);
	return Bun.file(path);
}
