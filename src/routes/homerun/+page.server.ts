import { highlightCode } from "$lib/server/highlight";

const BOOTSTRAP = `curl -fsSL https://raw.githubusercontent.com/orochibraru/homerun/main/packages/installer/bootstrap.sh \\
  | sudo bash -s -- --mode=full --domain=homerun.example.com`;

const INSTALL = `# already have Docker set up your way? just take the stack
curl -fsSLO https://raw.githubusercontent.com/orochibraru/homerun/main/compose.prod.yaml
curl -fsSLO https://raw.githubusercontent.com/orochibraru/homerun/main/.env.example
curl -fsSL https://raw.githubusercontent.com/orochibraru/homerun/main/homerun.example.yaml -o homerun.yaml

mv .env.example .env    # set AUTH_SECRET at minimum
docker network create homerun
docker compose -f compose.prod.yaml up -d`;

export const load = async () => ({
	bootstrap: await highlightCode(BOOTSTRAP, "bash"),
	install: await highlightCode(INSTALL, "bash"),
});
