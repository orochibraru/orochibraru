// The logger the scripts in here share, so `bun run build`, `bun run docs` and
// `bun run dev` all report the same way and a slow step is obvious.
//
// Three volumes, because these run in three places that want different things:
//
//     bun run build              a line per phase, with how long it took
//     VERBOSE=1 bun run build    every file it touched, as it touches it
//     QUIET=1 bun run build      warnings, errors and the summary only
//
// `dev` rebuilds on every save, so it runs the build QUIET and prints its own
// one-line summary. CI and Docker get the default.
const flag = (name: string) =>
  ["1", "true", "yes"].includes((process.env[name] ?? "").toLowerCase());

export const VERBOSE = flag("VERBOSE");
export const QUIET = flag("QUIET") && !VERBOSE;

// Colour is for a terminal. A CI log, a Docker build and a piped file are not
// one, and NO_COLOR is the convention for asking even a terminal to stop.
const COLOUR = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code: number, text: string) => (COLOUR ? `\x1b[${code}m${text}\x1b[0m` : text);

export const dim = (text: string) => paint(2, text);
const red = (text: string) => paint(31, text);
const yellow = (text: string) => paint(33, text);
const green = (text: string) => paint(32, text);

/** Durations, at a precision anyone actually reads. */
export const ms = (duration: number) =>
  duration < 1000 ? `${Math.round(duration)}ms` : `${(duration / 1000).toFixed(1)}s`;

const startedAt = performance.now();

/** How long this process has been running: the number the summary line ends on. */
export const sinceStart = () => ms(performance.now() - startedAt);

export type Log = ReturnType<typeof log>;

export function log(scope: string) {
  const tag = dim(scope.padEnd(6));
  const out = (mark: string, message: string) => console.log(`${tag} ${mark} ${message}`);
  const err = (mark: string, message: string) => console.error(`${tag} ${mark} ${message}`);

  const step = (message: string) => {
    if (!QUIET) out("▸", message);
  };
  const ok = (message: string) => {
    if (!QUIET) out(green("✓"), message);
  };

  return {
    /** A phase is starting. Printed before the work, so a hang names itself. */
    step,
    /** A phase finished. */
    ok,
    /** Worth reading, indented under the phase it belongs to. */
    info: (message: string) => {
      if (!QUIET) out(" ", dim(message));
    },
    /** Per-file chatter: only under VERBOSE. */
    detail: (message: string) => {
      if (VERBOSE) out(" ", dim(message));
    },
    /** Not fatal, but someone should look. Printed at every volume. */
    warn: (message: string) => err(yellow("!"), yellow(message)),
    /** Fatal, or a step that gave up. Printed at every volume. */
    fail: (message: string) => err(red("✗"), red(message)),
    /** The last line: what came out, and how long the whole thing took. */
    done: (message: string) => console.log(`${tag} ${green("✓")} ${message} ${dim(sinceStart())}`),

    /** Run a phase, timing it. Logs before and after, and names it if it throws. */
    async time<T>(label: string, run: () => T | Promise<T>): Promise<T> {
      step(label);
      const at = performance.now();
      try {
        const value = await run();
        ok(`${label} ${dim(ms(performance.now() - at))}`);
        return value;
      } catch (error) {
        err(red("✗"), red(`${label} failed after ${ms(performance.now() - at)}`));
        throw error;
      }
    },
  };
}
