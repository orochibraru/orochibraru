/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// The admin's service worker, registered from the admin with scope /admin, never
// for the public site. It caches nothing: its one job is notifications.
const sw = self as unknown as ServiceWorkerGlobalScope;

type Message = { title: string; body: string; url: string; tag?: string };

sw.addEventListener("install", () => {
	void sw.skipWaiting();
});
sw.addEventListener("activate", (event) => {
	event.waitUntil(sw.clients.claim());
});

sw.addEventListener("push", (event) => {
	const message = (event.data?.json() ?? {}) as Partial<Message>;
	event.waitUntil(
		sw.registration.showNotification(message.title ?? "orochibraru", {
			body: message.body,
			tag: message.tag,
			icon: "/admin/icon-192.png",
			badge: "/admin/icon-192.png",
			data: { url: message.url ?? "/admin" },
		}),
	);
});

// a tap opens what the notification is about, in the admin window already open if there is one
sw.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const url = new URL(
		(event.notification.data as { url?: string })?.url ?? "/admin",
		sw.location.origin,
	);
	event.waitUntil(
		(async () => {
			const open = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
			const admin = open.find((client) => new URL(client.url).pathname.startsWith("/admin"));
			if (admin) {
				await admin.focus();
				await admin.navigate(url.href);
				return;
			}
			await sw.clients.openWindow(url.href);
		})(),
	);
});
