// `bun run schema`: publish the docs/config.json schema as JSON Schema, served
// at https://orochibraru.com/docs-config.schema.json for the project repos to link.
import { z } from "zod";
import { DocsConfig, SCHEMA_URL } from "../src/lib/docs-config";

const schema = { ...z.toJSONSchema(DocsConfig), $id: SCHEMA_URL, title: "Docs config" };
await Bun.write("static/docs-config.schema.json", `${JSON.stringify(schema, null, "\t")}\n`);
// in biome's style, so regenerating an unchanged schema leaves no diff
Bun.spawnSync(["bunx", "biome", "format", "--write", "static/docs-config.schema.json"]);
