// The Dockerfile's HEALTHCHECK and scripts/lighthouse.ts probe this.
export const GET = () => Response.json({ status: "ok" });
