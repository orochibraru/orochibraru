FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run build

# The binary needs only libc, and CA certificates to reach GitHub and the IdP;
# curl is for the healthcheck.
FROM debian:bookworm-slim
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl \
	&& rm -rf /var/lib/apt/lists/* \
	&& useradd --system --create-home --uid 10001 app \
	&& mkdir -p /data && chown app:app /data
WORKDIR /app
COPY --from=build --chown=app:app /app/build ./build
COPY --from=build --chown=app:app /app/drizzle ./drizzle
USER 10001
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD ["sh", "-c", "curl -fsS \"http://127.0.0.1:${PORT}/_health\" > /dev/null || exit 1"]
CMD ["./build/server"]
