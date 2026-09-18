import { highlightCode } from "$lib/server/highlight";

const COMPOSE = `services:
  bercail:
    image: orochibraru/bercail:latest
    restart: unless-stopped
    environment:
      ORIGIN: https://dash.example.com
    ports:
      - 3000:3000
    volumes:
      - ./data:/app/data`;

export const load = async () => ({
	compose: await highlightCode(COMPOSE, "yaml"),
});
