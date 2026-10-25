// Web Push to the admin's browsers. The site signs each message with its own VAPID
// key pair, made on first use and kept in the database, and the browser's push
// service (Apple's, Google's, Mozilla's) wakes the admin's service worker with it.
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { open, seal } from "./crypto";
import { getDb } from "./db";
import { pushKeys, pushSubscription } from "./db/schema";

export type PushMessage = {
	title: string;
	body: string;
	/** Where a tap on the notification opens. */
	url: string;
	/** A second message with the same tag replaces the first instead of stacking. */
	tag?: string;
};

export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

type Send = (url: string, init: RequestInit) => Promise<Response>;
let send: Send = (url, init) => fetch(url, init);

/** Tests swap the push services for a fake. */
export function usePushFetch(fake: Send) {
	send = fake;
}

/** The key pair, made the first time anything asks for it. */
async function keys(): Promise<{ publicKey: string; privateKey: string }> {
	const db = getDb();
	const row = db.select().from(pushKeys).get();
	if (row) {
		return { publicKey: row.publicKey, privateKey: await open(row.privateKey) };
	}
	const made = webpush.generateVAPIDKeys();
	db.insert(pushKeys)
		.values({ id: 1, publicKey: made.publicKey, privateKey: await seal(made.privateKey) })
		.onConflictDoNothing()
		.run();
	// two first requests racing: whichever key landed is the key
	const kept = db.select().from(pushKeys).get();
	return kept ? { publicKey: kept.publicKey, privateKey: await open(kept.privateKey) } : made;
}

/** What a browser needs to subscribe: the public half of the key pair. */
export const publicKey = async () => (await keys()).publicKey;

/** Remember a browser, or refresh it if it subscribed before. */
export function subscribe(subscription: BrowserSubscription, email: string, device: string) {
	const values = {
		endpoint: subscription.endpoint,
		p256dh: subscription.keys.p256dh,
		auth: subscription.keys.auth,
		email,
		device: device.slice(0, 120),
	};
	getDb()
		.insert(pushSubscription)
		.values(values)
		.onConflictDoUpdate({ target: pushSubscription.endpoint, set: values })
		.run();
}

export function unsubscribe(endpoint: string) {
	getDb().delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint)).run();
}

export const subscriptions = () => getDb().select().from(pushSubscription).all();

/**
 * Send one message to every subscribed browser and return how many took it. A
 * browser whose subscription is gone (the push service answers 404 or 410) is
 * forgotten; any other failure is logged and the next message tries it again.
 */
export async function notify(message: PushMessage): Promise<number> {
	const rows = subscriptions();
	if (!rows.length) {
		return 0;
	}
	const vapid = await keys();
	const payload = JSON.stringify(message);
	const results = await Promise.all(
		rows.map(async (row) => {
			const request = webpush.generateRequestDetails(
				{ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
				payload,
				{
					// who to contact about these messages: the admin who subscribed (push services
					// refuse anything but mailto: or https:, and a dev origin is http)
					vapidDetails: { subject: `mailto:${row.email}`, ...vapid },
					TTL: 7 * 24 * 3600,
					urgency: "normal",
					topic: message.tag,
				},
			);
			try {
				const response = await send(request.endpoint, {
					method: request.method,
					headers: request.headers as Record<string, string>,
					body: new Uint8Array(request.body as Buffer),
				});
				if (response.status === 404 || response.status === 410) {
					unsubscribe(row.endpoint);
					return false;
				}
				if (!response.ok) {
					console.error(`push to ${row.device || "a browser"}: ${response.status}`);
					return false;
				}
				getDb()
					.update(pushSubscription)
					.set({ lastSentAt: new Date() })
					.where(eq(pushSubscription.endpoint, row.endpoint))
					.run();
				return true;
			} catch (cause) {
				console.error(`push to ${row.device || "a browser"}:`, cause);
				return false;
			}
		}),
	);
	return results.filter(Boolean).length;
}
