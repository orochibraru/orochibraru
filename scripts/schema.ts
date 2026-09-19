// `bun run schema`: publish the docs/config.json schema as JSON Schema, served
// at https://orochibraru.com/docs-config.schema.json for the project repos to link.
import { Glob } from "bun";
import { z } from "zod";
import { DocsConfig, SCHEMA_URL } from "../src/lib/docs-config";

const schema = { ...z.toJSONSchema(DocsConfig), $id: SCHEMA_URL, title: "Docs config" } as {
	$defs?: { Icon?: Record<string, unknown> };
};
// every icon @lucide/svelte ships, by its kebab-case file name: autocomplete in the repos
const names = [...new Glob("*.svelte").scanSync("node_modules/@lucide/svelte/dist/icons")]
	.map((file) => file.replace(/\.svelte$/, ""))
	.sort();
if (schema.$defs?.Icon) {
	schema.$defs.Icon = { ...schema.$defs.Icon, enum: names };
}
await Bun.write("static/docs-config.schema.json", `${JSON.stringify(schema, null, "\t")}\n`);
// in biome's style, so regenerating an unchanged schema leaves no diff
Bun.spawnSync(["bunx", "biome", "format", "--write", "static/docs-config.schema.json"]);
