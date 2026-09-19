// `bun run import`: load the content that used to live in the repo into an
// empty database under DATA_DIR. src/projects/*.md become project rows,
// src/posts/*.md posts, src/docs/<repo>/ each project's guides, docs config and
// screenshots. Refuses to touch a database that already has content.
//
// The Docker build runs it into a seed directory, which a fresh volume starts
// from on first boot (see seedIfEmpty in src/lib/server/db).
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { Glob } from "bun";
import { z } from "zod";
import { ROOT_GUIDES } from "../src/lib/projects";
import { migrateDatabase, openDatabase, useDatabase } from "../src/lib/server/db";
import { guide, post, project } from "../src/lib/server/db/schema";
import { env } from "../src/lib/server/env";
import { storeImage } from "../src/lib/server/images";
import { frontmatter } from "../src/lib/server/posts";
import { ProjectFields } from "../src/lib/server/project-pages";

/** The sha git itself gives a blob, so the first sync sees unchanged guides as unchanged. */
export const gitBlobSha = (bytes: Uint8Array) =>
	new Bun.CryptoHasher("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");

const PostFields = z.object({
	title: z.string().min(1),
	date: z
		.union([z.string(), z.date()])
		.transform((date) => (typeof date === "string" ? date : date.toISOString().slice(0, 10))),
	description: z.string().min(1),
});

export async function importContent(dir: string, root = ".") {
	const db = openDatabase(dir);
	migrateDatabase(db);
	useDatabase(db, dir);
	if (db.select().from(project).get() || db.select().from(post).get()) {
		throw new Error(`${dir}/site.db already has content: import only fills an empty database`);
	}

	for (const file of new Glob("src/projects/*.md").scanSync(root)) {
		const repo = basename(file, ".md");
		const [meta, body] = frontmatter(await Bun.file(`${root}/${file}`).text());
		const { position, ...fields } = meta as { position?: number } & Record<string, unknown>;
		const parsed = ProjectFields.safeParse(fields);
		if (!parsed.success) {
			throw new Error(`${file} is invalid:\n${z.prettifyError(parsed.error)}`);
		}
		const docs = `${root}/src/docs/${repo}`;
		const config = Bun.file(`${docs}/config.json`);
		db.insert(project)
			.values({
				repo,
				...parsed.data,
				image: parsed.data.image ?? null,
				body: body.trim(),
				position: position ?? 0,
				githubRepo: `orochibraru/${repo}`,
				defaultBranch: "main",
				docsConfig: (await config.exists()) ? await config.json() : null,
				published: true,
			})
			.run();

		if (!existsSync(docs)) {
			continue;
		}
		for (const guideFile of new Glob("*.md").scanSync(docs)) {
			const slug = basename(guideFile, ".md");
			const bytes = await Bun.file(`${docs}/${guideFile}`).bytes();
			const root = ROOT_GUIDES.find((guide) => guide.slug === slug);
			db.insert(guide)
				.values({
					project: repo,
					slug,
					markdown: new TextDecoder().decode(bytes),
					sourcePath: root?.file ?? `docs/${slug}.md`,
					sha: gitBlobSha(bytes),
				})
				.run();
		}
		for (const imageFile of new Glob("images/*.webp").scanSync(docs)) {
			await storeImage(await Bun.file(`${docs}/${imageFile}`).bytes(), {
				source: "sync",
				project: repo,
				name: basename(imageFile, ".webp"),
			});
		}
	}

	for (const file of new Glob("src/posts/*.md").scanSync(root)) {
		const [meta, body] = frontmatter(await Bun.file(`${root}/${file}`).text());
		const parsed = PostFields.safeParse(meta);
		if (!parsed.success) {
			throw new Error(`${file} is invalid:\n${z.prettifyError(parsed.error)}`);
		}
		db.insert(post)
			.values({
				slug: basename(file, ".md"),
				...parsed.data,
				body: body.trim(),
				status: "published",
			})
			.run();
	}

	// one self-contained file, so the seed can be copied as it is
	db.$client.run("PRAGMA wal_checkpoint(TRUNCATE)");
	return db;
}

if (import.meta.main) {
	const db = await importContent(env.dataDir);
	const count = (table: string) =>
		(db.$client.query(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
	console.log(
		`imported ${count("project")} projects, ${count("guide")} guides, ${count("image")} images and ${count("post")} posts into ${env.dataDir}`,
	);
	db.$client.close();
}
