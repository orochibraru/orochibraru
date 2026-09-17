import { highlightCode } from "$lib/server/highlight";

const RUN = `docker run -p 3000:3000 -e ORIGIN=http://localhost:3000 \\
  orochibraru/nuvio-web:latest`;

const COMPOSE = `services:
  nuvio:
    image: orochibraru/nuvio-web:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      # the URL you actually browse to
      ORIGIN: http://localhost:3000
    healthcheck:
      test: ["CMD", "/app/dist/healthcheck"]
      interval: 30s
      timeout: 30s
      retries: 3
      start_period: 5s`;

export const load = async () => ({
	run: await highlightCode(RUN, "bash"),
	compose: await highlightCode(COMPOSE, "yaml"),
});
