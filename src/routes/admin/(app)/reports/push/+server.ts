import { error } from "@sveltejs/kit";
import { requireAdmin } from "$lib/server/admin";
import { type BrowserSubscription, subscribe, unsubscribe } from "$lib/server/push";

const isSubscription = (value: unknown): value is BrowserSubscription => {
	const { endpoint, keys } = (value ?? {}) as Partial<BrowserSubscription>;
	return (
		typeof endpoint === "string" &&
		endpoint.startsWith("https://") &&
		typeof keys?.p256dh === "string" &&
		typeof keys.auth === "string"
	);
};

/** This browser turns the admin's notifications on. */
export const POST = async (event) => {
	const admin = await requireAdmin(event);
	const body = (await event.request.json().catch(() => null)) as {
		subscription?: unknown;
		device?: unknown;
	} | null;
	if (!isSubscription(body?.subscription)) {
		throw error(400, "Not a push subscription");
	}
	subscribe(body.subscription, admin.email, String(body.device ?? ""));
	return new Response(null, { status: 204 });
};

/** This browser turns them off. */
export const DELETE = async (event) => {
	await requireAdmin(event);
	const body = (await event.request.json().catch(() => null)) as { endpoint?: unknown } | null;
	if (typeof body?.endpoint === "string") {
		unsubscribe(body.endpoint);
	}
	return new Response(null, { status: 204 });
};
