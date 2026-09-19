import { handleWebhook } from "$lib/server/github/webhook";

export const POST = ({ request }) => handleWebhook(request);
