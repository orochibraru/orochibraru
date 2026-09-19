FROM oven/bun:1 AS build
RUN apt-get update \
	&& apt-get install -y --no-install-recommends webp \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run build \
	&& DATA_DIR=/app/seed bun run import

# The binary needs only libc; cwebp re-encodes every uploaded and synced image.
FROM debian:bookworm-slim
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates webp \
	&& rm -rf /var/lib/apt/lists/* \
	&& useradd --system --create-home --uid 10001 app \
	&& mkdir -p /data && chown app:app /data
WORKDIR /app
COPY --from=build --chown=app:app /app/build ./build
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/seed ./seed
USER 10001
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD ["./build/healthcheck"]
CMD ["./build/server"]
