// Every image on the site, uploaded or synced from a repo: re-encoded to WebP
// with cwebp (the settings `bun run docs` always used), stored once per content
// hash under DATA_DIR/images, and described by a row in `image`.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { getDataDir, getDb } from "./db";
import { type Channel, image } from "./db/schema";

const WIDTH = 1200; // twice the widest a screenshot is ever displayed
const QUALITY = 80;

export type Image = { id: number; sha256: string; width: number; height: number; url: string };

export type ImageMeta = {
	alt?: string;
	source: "upload" | "sync";
	/** With `name`: a repo screenshot, addressed in Markdown as ![alt](name). */
	project?: string;
	name?: string;
	channel?: Channel;
	sourceSha?: string;
};

export const imageUrl = (sha256: string) => `/images/${sha256}.webp`;

const toImage = (row: typeof image.$inferSelect): Image => ({
	id: row.id,
	sha256: row.sha256,
	width: row.width,
	height: row.height,
	url: imageUrl(row.sha256),
});

/**
 * Width and height straight out of the WebP header. Covers the three chunk
 * layouts cwebp emits; anything else gets null rather than a wrong answer.
 */
export function webpSize(bytes: Uint8Array): { width: number; height: number } | null {
	if (bytes.length < 30) {
		return null;
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const fourCC = String.fromCharCode(...bytes.subarray(12, 16));
	if (fourCC === "VP8 ") {
		return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
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

/** PNG, JPEG, WebP or TIFF in; WebP no wider than 1200px out. Throws on anything else. */
export async function encodeWebp(bytes: Uint8Array): Promise<Uint8Array> {
	const scratch = await mkdtemp(join(tmpdir(), "img-"));
	try {
		const input = join(scratch, "in");
		const output = join(scratch, "out.webp");
		await Bun.write(input, bytes);
		const run = Bun.spawn(
			[
				"cwebp",
				"-quiet",
				"-q",
				String(QUALITY),
				"-resize",
				String(WIDTH),
				"0",
				input,
				"-o",
				output,
			],
			{ stderr: "pipe" },
		);
		if ((await run.exited) !== 0) {
			const reason = (await new Response(run.stderr).text()).trim();
			throw new Error(`not an image cwebp can read${reason ? `: ${reason}` : ""}`);
		}
		return await Bun.file(output).bytes();
	} finally {
		await rm(scratch, { recursive: true, force: true });
	}
}

export type Prepared = { sha256: string; width: number; height: number };

/**
 * Encode and write the file, but touch no rows: the file is named after its hash,
 * so one left behind by a failed sync is harmless, and the sync can add the rows
 * inside its own transaction.
 */
export async function prepareImage(bytes: Uint8Array): Promise<Prepared> {
	const webp = await encodeWebp(bytes);
	const size = webpSize(webp);
	if (!size) {
		throw new Error("cwebp wrote a WebP this site can't measure");
	}
	const sha256 = new Bun.CryptoHasher("sha256").update(webp).digest("hex");
	const file = Bun.file(join(getDataDir(), "images", `${sha256}.webp`));
	if (!(await file.exists())) {
		await Bun.write(file, webp);
	}
	return { sha256, ...size };
}

type Writer = Pick<ReturnType<typeof getDb>, "insert" | "select">;

/** The row for a prepared image: by (project, name) for screenshots, by hash for uploads. */
export function recordImage(prepared: Prepared, meta: ImageMeta, db: Writer = getDb()): Image {
	const values = {
		...prepared,
		alt: meta.alt ?? "",
		source: meta.source,
		project: meta.project ?? null,
		name: meta.name ?? null,
		channel: meta.channel ?? "latest",
		sourceSha: meta.sourceSha ?? null,
	};
	if (meta.project && meta.name) {
		const [row] = db
			.insert(image)
			.values(values)
			.onConflictDoUpdate({
				target: [image.project, image.channel, image.name],
				set: { ...prepared, sourceSha: values.sourceSha, ...(meta.alt && { alt: meta.alt }) },
			})
			.returning()
			.all();
		return toImage(row as typeof image.$inferSelect);
	}
	// the same upload twice is the same image
	const existing = db
		.select()
		.from(image)
		.where(and(eq(image.sha256, prepared.sha256), isNull(image.name)))
		.get();
	if (existing) {
		return toImage(existing);
	}
	const [row] = db.insert(image).values(values).returning().all();
	return toImage(row as typeof image.$inferSelect);
}

export async function storeImage(bytes: Uint8Array, meta: ImageMeta): Promise<Image> {
	return recordImage(await prepareImage(bytes), meta);
}

export function imageByName(
	project: string,
	name: string,
	channel: Channel = "latest",
): Image | undefined {
	const row = getDb()
		.select()
		.from(image)
		.where(and(eq(image.project, project), eq(image.channel, channel), eq(image.name, name)))
		.get();
	return row && toImage(row);
}
