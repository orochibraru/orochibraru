<script lang="ts">
	import { Bell, BellOff, ChevronRight, Send } from "@lucide/svelte";
	import { onMount } from "svelte";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { ago } from "$lib/admin";

	let { data, form } = $props();

	// what this browser can do about notifications, worked out once it's on screen
	type State = "checking" | "unsupported" | "install" | "denied" | "off" | "on";
	let status = $state<State>("checking");
	let busy = $state(false);
	let problem = $state<string>();
	let mine = $state<string>();

	const pushUrl = resolve("/admin/(app)/reports/push");

	async function registration() {
		return navigator.serviceWorker.ready;
	}

	onMount(async () => {
		if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
			// iOS only offers push to a web app added to the home screen
			const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
			status = ios && !matchMedia("(display-mode: standalone)").matches ? "install" : "unsupported";
			return;
		}
		const subscription = await (await registration()).pushManager.getSubscription();
		mine = subscription?.endpoint;
		status = subscription ? "on" : Notification.permission === "denied" ? "denied" : "off";
	});

	/** "iPhone, Safari": enough to tell devices apart in the list. */
	function deviceName() {
		const agent = navigator.userAgent;
		const device = /iPhone/.test(agent)
			? "iPhone"
			: /iPad/.test(agent)
				? "iPad"
				: /Android/.test(agent)
					? "Android"
					: /Mac/.test(agent)
						? "Mac"
						: /Windows/.test(agent)
							? "Windows"
							: "Linux";
		const browser = /Edg\//.test(agent)
			? "Edge"
			: /Firefox\//.test(agent)
				? "Firefox"
				: /Chrome\//.test(agent)
					? "Chrome"
					: "Safari";
		return `${device}, ${browser}`;
	}

	async function turnOn() {
		busy = true;
		problem = undefined;
		try {
			if ((await Notification.requestPermission()) !== "granted") {
				status = "denied";
				return;
			}
			const subscription = await (await registration()).pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: data.publicKey,
			});
			const response = await fetch(pushUrl, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ subscription: subscription.toJSON(), device: deviceName() }),
			});
			if (!response.ok) {
				await subscription.unsubscribe();
				throw new Error(`The server refused it: ${response.status}`);
			}
			mine = subscription.endpoint;
			status = "on";
			await invalidateAll();
		} catch (cause) {
			// a private window, or a browser whose push service refused it
			problem = `Couldn't turn notifications on: ${cause instanceof Error ? cause.message : cause}`;
		} finally {
			busy = false;
		}
	}

	async function turnOff() {
		busy = true;
		problem = undefined;
		try {
			const subscription = await (await registration()).pushManager.getSubscription();
			if (subscription) {
				await fetch(pushUrl, {
					method: "DELETE",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ endpoint: subscription.endpoint }),
				});
				await subscription.unsubscribe();
			}
			mine = undefined;
			status = "off";
			await invalidateAll();
		} catch (cause) {
			problem = `Couldn't turn notifications off: ${cause instanceof Error ? cause.message : cause}`;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Reports | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
	<h1 class="text-base font-semibold">Reports</h1>
	<p class="text-sm text-dim">Last week in one page, every Monday at 08:00 UTC.</p>
	<form class="ml-auto" method="POST" action="?/send" use:enhance>
		<button class="abtn" type="submit"><Send class="size-3.5" aria-hidden="true" /> Send last week's</button>
	</form>
</div>

{#if form?.message}
	<p class="mb-4 border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">{form.message}</p>
{:else if form && "sent" in form}
	<p class="mb-4 border border-line bg-surface px-3 py-2 text-sm" role="status">
		<span class="status status-on">Sent</span> to {form.sent} browser{form.sent === 1 ? "" : "s"}.
	</p>
{/if}

<section class="apanel mb-4">
	<header>
		Notifications
		{#if status === "on"}<span class="status status-on ml-auto">on in this browser</span>{/if}
	</header>
	<div class="grid gap-3 p-4 text-[.8125rem] text-dim">
		{#if status === "install"}
			<p>
				On an iPhone or iPad, notifications only reach a web app on the home screen. Tap
				<strong class="text-fg">Share</strong>, then <strong class="text-fg">Add to Home Screen</strong>, open the
				admin from there and come back to this page.
			</p>
		{:else if status === "unsupported"}
			<p>This browser can't receive push notifications.</p>
		{:else if status === "denied"}
			<p>
				Notifications are blocked for this site. Allow them in the browser's site settings (on a phone, the app's
				notification settings), then reload.
			</p>
		{:else}
			<p>The weekly report arrives as a notification in every browser turned on here. Tap it to open the report.</p>
			{#if problem}<p class="text-hot" role="alert">{problem}</p>{/if}
			<div class="flex flex-wrap gap-2">
				{#if status === "on"}
					<form method="POST" action="?/test" use:enhance>
						<button class="abtn" type="submit"><Bell class="size-3.5" aria-hidden="true" /> Send a test</button>
					</form>
					<button class="abtn abtn-danger" type="button" onclick={turnOff} disabled={busy}>
						<BellOff class="size-3.5" aria-hidden="true" /> Turn off in this browser
					</button>
				{:else}
					<button class="abtn abtn-primary" type="button" onclick={turnOn} disabled={busy || status === "checking"}>
						<Bell class="size-3.5" aria-hidden="true" /> Turn on in this browser
					</button>
				{/if}
			</div>
		{/if}
	</div>
	{#if data.devices.length}
		<table class="atable">
			<tbody>
				{#each data.devices as device (device.endpoint)}
					<tr>
						<td class="w-full">
							{device.device || "A browser"}
							{#if device.endpoint === mine}<span class="text-xs text-dim">(this one)</span>{/if}
						</td>
						<td class="wide text-xs whitespace-nowrap text-dim">
							{device.lastSentAt ? `last reached ${ago(device.lastSentAt)}` : `added ${ago(device.createdAt)}`}
						</td>
						<td class="py-1.5">
							<form method="POST" action="?/forget" use:enhance>
								<input type="hidden" name="endpoint" value={device.endpoint}>
								<button class="abtn abtn-danger h-7 text-xs" type="submit">Forget</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<section class="apanel">
	<header>Past weeks</header>
	<table class="atable">
		<tbody>
			{#each data.reports as report (report.id)}
				<tr>
					<td class="w-full">
						<a class="row-link" href={resolve("/admin/(app)/reports/[id]", { id: String(report.id) })}>{report.label}</a>
						<p class="mt-0.5 text-[13px] text-dim">{report.summary}</p>
					</td>
					<td><ChevronRight class="size-4 text-dim" aria-hidden="true" /></td>
				</tr>
			{:else}
				<tr>
					<td class="py-8 text-center text-dim">The first report arrives next Monday, or now with Send last week's.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
