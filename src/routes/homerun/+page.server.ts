import { highlightCode } from "$lib/server/highlight";

const INSTALL = `# already have Docker set up your way? just take the stack
curl -fsSLO https://raw.githubusercontent.com/orochibraru/homerun/main/compose.prod.yaml
curl -fsSLO https://raw.githubusercontent.com/orochibraru/homerun/main/.env.example
curl -fsSL https://raw.githubusercontent.com/orochibraru/homerun/main/homerun.example.yaml -o homerun.yaml

mv .env.example .env    # set AUTH_SECRET at minimum
docker network create homerun
docker compose -f compose.prod.yaml up -d`;

export const load = async () => ({ install: await highlightCode(INSTALL, "bash") });
