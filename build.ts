// `bun build` (CLI) can't load plugins, so the static build goes through Bun.build.
import tailwind from "bun-plugin-tailwind";
import { rm, cp } from "node:fs/promises";
import { Glob } from "bun";

await rm("dist", { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [...new Glob("src/*.html").scanSync(".")],
  root: "src",
  outdir: "dist",
  minify: true,
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Bun emits one empty JS chunk per page (the inline scripts stay inline). Drop them
// so every page isn't fetching a 0-byte module.
const empty = new Set<string>();
for (const js of new Glob("dist/*.js").scanSync(".")) {
  if (Bun.file(js).size > 0) continue;
  empty.add(js.split("/").pop()!);
  await rm(js);
}
for (const html of new Glob("dist/*.html").scanSync(".")) {
  const src = await Bun.file(html).text();
  const cleaned = src.replace(/<script[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (tag, file) =>
    empty.has(file) ? "" : tag,
  );
  if (cleaned !== src) await Bun.write(html, cleaned);
}

for (const f of ["robots.txt", "sitemap.xml"]) await cp(`src/${f}`, `dist/${f}`);
console.log(`built ${result.outputs.length} files -> dist/`);
