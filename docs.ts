// `bun run docs`: pull each project's operator docs into this repo.
//
// The Markdown in those repos' docs/ folders is the source; this site is where
// it gets published. Guides land in src/docs/<project>/ verbatim — rewriting
// happens at build time, not here, so what is vendored stays diffable against
// upstream — and docs/images/ is re-encoded to WebP alongside them.
//
// .github/workflows/docs.yml runs this daily and commits whatever moved.
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Glob } from "bun";
import { PROJECTS, docsDir, type Project } from "./projects";

const WIDTH = 1200; // twice the widest a screenshot is ever displayed
const QUALITY = 80;

if (!Bun.which("cwebp")) {
  console.error("cwebp not found: brew install webp, or apt-get install webp");
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN;
const headers = token ? { authorization: `Bearer ${token}` } : undefined;

const changed: string[] = [];
const notes: string[] = [];
const failed: string[] = [];

/** Write only if the bytes differ, so an unchanged sync makes no commit. */
async function writeIfChanged(path: string, bytes: Uint8Array, label: string) {
  const before = await Bun.file(path).bytes().catch(() => null);
  if (before && before.length === bytes.length && Buffer.from(before).equals(bytes)) return;
  await Bun.write(path, bytes);
  changed.push(`${before ? "updated" : "added  "} ${label}`);
}

async function listDocs(project: Project) {
  const url = `https://api.github.com/repos/${new URL(project.repo).pathname.slice(1)}/git/trees/${project.branch}?recursive=1`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${project.key}: GitHub said ${response.status} ${response.statusText}`);

  const { tree } = (await response.json()) as { tree: { path: string; type: string }[] };
  const files = tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
  return {
    guides: files
      .filter((path) => path.startsWith("docs/") && path.endsWith(".md") && !path.endsWith("/README.md"))
      .filter((path) => path.split("/").length === 2),
    images: files.filter((path) => path.startsWith("docs/images/") && /\.(png|jpe?g|webp)$/.test(path)),
  };
}

const raw = (project: Project, path: string) =>
  `https://raw.githubusercontent.com/${new URL(project.repo).pathname.slice(1)}/${project.branch}/${path}`;

async function fetchBytes(project: Project, path: string) {
  const response = await fetch(raw(project, path));
  if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);
  return new Uint8Array(await response.arrayBuffer());
}

const scratch = await mkdtemp(join(tmpdir(), "docs-"));

for (const project of PROJECTS) {
  const directory = docsDir(project);
  await mkdir(`${directory}/images`, { recursive: true });

  let inventory: Awaited<ReturnType<typeof listDocs>>;
  try {
    inventory = await listDocs(project);
  } catch (error) {
    failed.push(String(error));
    continue;
  }

  const slugs: string[] = [];
  for (const path of inventory.guides) {
    const slug = path.slice("docs/".length).replace(/\.md$/, "");
    slugs.push(slug);
    try {
      await writeIfChanged(`${directory}/${slug}.md`, await fetchBytes(project, path), `${project.key}/${slug}.md`);
    } catch (error) {
      failed.push(String(error));
    }
  }

  for (const path of inventory.images) {
    const name = path.slice("docs/images/".length).replace(/\.[a-z]+$/i, "");
    try {
      const original = join(scratch, path.split("/").pop()!);
      await Bun.write(original, await fetchBytes(project, path));

      const encoded = join(scratch, `${name}.webp`);
      const run = Bun.spawnSync([
        "cwebp", "-quiet", "-q", String(QUALITY), "-resize", String(WIDTH), "0", original, "-o", encoded,
      ]);
      if (run.exitCode !== 0) throw new Error(`${path}: cwebp exited ${run.exitCode}`);

      await writeIfChanged(
        `${directory}/images/${name}.webp`,
        await Bun.file(encoded).bytes(),
        `${project.key}/images/${name}.webp`,
      );
    } catch (error) {
      failed.push(String(error));
    }
  }

  // a guide that exists upstream but isn't in the sidebar, or the other way round
  for (const slug of slugs) {
    if (!project.order.includes(slug)) notes.push(`${project.key}: ${slug} is not in its order[] — it will sort last`);
  }
  for (const slug of project.order) {
    if (!slugs.includes(slug)) notes.push(`${project.key}: order[] lists ${slug}, which upstream no longer has`);
  }

  // drop guides and images that upstream deleted
  for (const existing of new Glob("*.md").scanSync(directory)) {
    const slug = existing.replace(/\.md$/, "");
    if (slugs.includes(slug)) continue;
    await rm(`${directory}/${existing}`);
    changed.push(`removed  ${project.key}/${existing}`);
  }
  const keep = new Set(inventory.images.map((p) => `${p.slice("docs/images/".length).replace(/\.[a-z]+$/i, "")}.webp`));
  for (const existing of new Glob("*.webp").scanSync(`${directory}/images`)) {
    if (keep.has(existing)) continue;
    await rm(`${directory}/images/${existing}`);
    changed.push(`removed  ${project.key}/images/${existing}`);
  }
}

await rm(scratch, { recursive: true, force: true });

console.log(`${PROJECTS.length} project(s) synced, ${changed.length} file(s) changed`);
for (const line of changed) console.log(`  ${line}`);
for (const line of notes) console.log(`  note: ${line}`);
for (const line of failed) console.error(`  FAILED ${line}`);

process.exit(failed.length ? 1 : 0);
