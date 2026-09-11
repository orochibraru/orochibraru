// `bun run dev`: build, serve what was built, rebuild when a source file changes.
//
// It serves dist/ rather than src/ because Bun's dev server hands .html entry
// documents to the browser without running bundler plugins over them, so the
// #includes in src/ would still be comments there. It does reload a file it
// serves when that file changes on disk, which is exactly what a rebuild does:
// edit a page, the browser catches up on its own a second later.
import { watch } from "node:fs";
import { Glob } from "bun";

const build = () =>
  Bun.spawnSync(["bun", "run", "build.ts"], { stdout: "inherit", stderr: "inherit" });

build();

const server = Bun.spawn(["bun", ...new Glob("dist/**/*.html").scanSync(".")], {
  stdout: "inherit",
  stderr: "inherit",
});

// What the build writes back into src/: watching these would rebuild forever.
const GENERATED = /^(blog|[^/]+\/docs)(\/|$)/;

let queued: ReturnType<typeof setTimeout> | undefined;
watch("src", { recursive: true }, (_event, file) => {
  if (typeof file === "string" && GENERATED.test(file)) return;
  clearTimeout(queued);
  queued = setTimeout(build, 50);
});

process.on("SIGINT", () => {
  server.kill();
  process.exit(0);
});
