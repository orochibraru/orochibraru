import { handleWebhook } from "#lib/server/github/webhook.ts";

export const POST = ({ request }) => handleWebhook(request);
