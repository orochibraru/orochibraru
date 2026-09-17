import { highlightCode } from "$lib/server/highlight";

const INSTALL = `# Linux / macOS
curl -fsSL https://github.com/orochibraru/baba/releases/latest/download/install.sh | sh

baba setup    # interactive wizard: notifier credentials + thresholds
baba install  # register as a background service`;

export const load = async () => ({ install: await highlightCode(INSTALL, "bash") });
