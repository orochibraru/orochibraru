// `bun run docs`: pull each project's operator docs into this repo.
//
// The Markdown in those repos' docs/ folders is the source; this site is where
// it gets published. Guides land in src/docs/<project>/ verbatim — rewriting
// happens at build time, not here, so what is vendored stays diffable against
// upstream — and docs/images/ is re-encoded to WebP alongside them.
//
// .github/workflows/docs.yml runs this daily and commits whatever moved.
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Glob } from "bun";
import { docsDir, PROJECTS, type Project } from "../src/lib/projects";
import { log } from "./log";

const out = log("docs");

const WIDTH = 1200; // twice the widest a screenshot is ever displayed
const QUALITY = 80;

if (!Bun.which("cwebp")) {
	out.fail("cwebp not found: brew install webp, or apt-get install webp");
	process.exit(1);
}

const token = process.env.GITHUB_TOKEN;
const headers = token ? { authorization: `Bearer ${token}` } : undefined;
// Anonymous is 60 requests an hour, and a full sync spends one per file: worth
// saying out loud, because the failure it causes is a 403 halfway through.
out.info(
	token ? "authenticating with GITHUB_TOKEN" : "no GITHUB_TOKEN: anonymous, and rate-limited",
);

const changed: string[] = [];
const notes: string[] = [];
const failed: string[] = [];

/** Write only if the bytes differ, so an unchanged sync makes no commit. */
async function writeIfChanged(path: string, bytes: Uint8Array, label: string) {
	const before = await Bun.file(path)
		.bytes()
		.catch(() => null);
	if (before && before.length === bytes.length && Buffer.from(before).equals(bytes)) {
		return;
	}
	await Bun.write(path, bytes);
	changed.push(`${before ? "updated" : "added  "} ${label}`);
	out.detail(`${before ? "updated" : "added"} ${label} (${bytes.length} bytes)`);
}

async function listDocs(project: Project) {
	const url = `https://api.github.com/repos/${new URL(project.repo).pathname.slice(1)}/git/trees/${project.branch}?recursive=1`;
	out.detail(`GET ${url}`);
	const response = await fetch(url, { headers });
	if (!response.ok) {
		const remaining = response.headers.get("x-ratelimit-remaining");
		const limit = remaining === "0" ? " (rate limit exhausted — set GITHUB_TOKEN)" : "";
		throw new Error(
			`${project.key}: GitHub said ${response.status} ${response.statusText}${limit}`,
		);
	}

	const { tree } = (await response.json()) as { tree: { path: string; type: string }[] };
	const files = tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
	return {
		config: files.includes("docs/config.json"),
		guides: files
			.filter(
				(path) => path.startsWith("docs/") && path.endsWith(".md") && !path.endsWith("/README.md"),
			)
			.filter((path) => path.split("/").length === 2)
			// the repo's contributing guide, published alongside as the `contributing` guide
			.concat(files.filter((path) => path === CONTRIBUTING)),
		images: files.filter(
			(path) => path.startsWith("docs/images/") && /\.(png|jpe?g|webp)$/.test(path),
		),
	};
}

/** Lives at the repo root, not in docs/: guides.ts resolves its links from there. */
const CONTRIBUTING = "CONTRIBUTING.md";

const raw = (project: Project, path: string) =>
	`https://raw.githubusercontent.com/${new URL(project.repo).pathname.slice(1)}/${project.branch}/${path}`;

async function fetchBytes(project: Project, path: string) {
	out.detail(`GET ${path}`);
	const response = await fetch(raw(project, path));
	if (!response.ok) {
		throw new Error(`${path}: ${response.status} ${response.statusText}`);
	}
	return new Uint8Array(await response.arrayBuffer());
}

const scratch = await mkdtemp(join(tmpdir(), "docs-"));

for (const project of PROJECTS) {
	const directory = docsDir(project);
	await mkdir(`${directory}/images`, { recursive: true });

	out.step(`${project.key} <- ${project.repo}#${project.branch}`);

	let inventory: Awaited<ReturnType<typeof listDocs>>;
	try {
		inventory = await out.time(`${project.key}: list upstream docs/`, () => listDocs(project));
	} catch (error) {
		out.fail(String(error));
		failed.push(String(error));
		continue;
	}
	out.info(
		`${project.key}: ${inventory.guides.length} guide(s), ${inventory.images.length} image(s) upstream`,
	);

	const slugs: string[] = [];
	await out.time(`${project.key}: fetch guides`, async () => {
		for (const path of inventory.guides) {
			const slug =
				path === CONTRIBUTING ? "contributing" : path.slice("docs/".length).replace(/\.md$/, "");
			slugs.push(slug);
			try {
				await writeIfChanged(
					`${directory}/${slug}.md`,
					await fetchBytes(project, path),
					`${project.key}/${slug}.md`,
				);
			} catch (error) {
				out.fail(String(error));
				failed.push(String(error));
			}
		}
	});

	await out.time(`${project.key}: fetch and re-encode images`, async () => {
		for (const path of inventory.images) {
			const name = path.slice("docs/images/".length).replace(/\.[a-z]+$/i, "");
			try {
				const original = join(scratch, basename(path));
				await Bun.write(original, await fetchBytes(project, path));

				const encoded = join(scratch, `${name}.webp`);
				const run = Bun.spawnSync([
					"cwebp",
					"-quiet",
					"-q",
					String(QUALITY),
					"-resize",
					String(WIDTH),
					"0",
					original,
					"-o",
					encoded,
				]);
				if (run.exitCode !== 0) {
					throw new Error(`${path}: cwebp exited ${run.exitCode}`);
				}

				await writeIfChanged(
					`${directory}/images/${name}.webp`,
					await Bun.file(encoded).bytes(),
					`${project.key}/images/${name}.webp`,
				);
			} catch (error) {
				out.fail(String(error));
				failed.push(String(error));
			}
		}
	});

	// validated by the build, not here: that is what fails the docs workflow before it commits
	const config = `${directory}/config.json`;
	if (inventory.config) {
		try {
			await writeIfChanged(
				config,
				await fetchBytes(project, "docs/config.json"),
				`${project.key}/config.json`,
			);
		} catch (error) {
			out.fail(String(error));
			failed.push(String(error));
		}
	} else {
		notes.push(
			`${project.key}: no docs/config.json upstream — guides sort alphabetically, uncategorised`,
		);
		if (await Bun.file(config).exists()) {
			await rm(config);
			changed.push(`removed  ${project.key}/config.json`);
		}
	}

	// drop guides and images that upstream deleted
	for (const existing of new Glob("*.md").scanSync(directory)) {
		const slug = existing.replace(/\.md$/, "");
		if (slugs.includes(slug)) {
			continue;
		}
		await rm(`${directory}/${existing}`);
		changed.push(`removed  ${project.key}/${existing}`);
		out.detail(`removed ${project.key}/${existing}, gone upstream`);
	}
	const keep = new Set(
		inventory.images.map((p) => `${p.slice("docs/images/".length).replace(/\.[a-z]+$/i, "")}.webp`),
	);
	for (const existing of new Glob("*.webp").scanSync(`${directory}/images`)) {
		if (keep.has(existing)) {
			continue;
		}
		await rm(`${directory}/images/${existing}`);
		changed.push(`removed  ${project.key}/images/${existing}`);
		out.detail(`removed ${project.key}/images/${existing}, gone upstream`);
	}
}

await rm(scratch, { recursive: true, force: true });

for (const line of changed) {
	out.info(line);
}
for (const line of notes) {
	out.warn(line);
}

if (failed.length) {
	out.fail(`${failed.length} file(s) failed`);
	for (const line of failed) {
		out.fail(`  ${line}`);
	}
}

out.done(
	`${PROJECTS.length} project(s) synced, ${changed.length} file(s) changed` +
		(changed.length ? " — commit them" : ""),
);

process.exit(failed.length ? 1 : 0);
