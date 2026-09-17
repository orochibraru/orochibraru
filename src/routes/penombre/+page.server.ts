import { highlightCode } from "$lib/server/highlight";

const RUN = `docker run -d --name penombre \\
  -p 3000:3000 \\
  -v penombre_data:/data \\
  -e AUTH_SECRET=$(openssl rand -hex 32) \\
  -e ORIGIN=https://drive.example.com \\
  orochibraru/penombre:latest`;

const COMPOSE = `services:
  penombre:
    image: orochibraru/penombre:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    volumes:
      - penombre_data:/data
    environment:
      AUTH_SECRET: a-long-random-string
      ORIGIN: https://drive.example.com

volumes:
  penombre_data:`;

export const load = async () => ({
	run: await highlightCode(RUN, "bash"),
	compose: await highlightCode(COMPOSE, "yaml"),
});
