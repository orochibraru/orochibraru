<script lang="ts">
	import { authClient } from "$lib/auth-client";

	let { data } = $props();
	let busy = $state(false);
	let failure = $state("");

	const DESCRIPTIONS: Record<string, string> = {
		openid: "Know who you are",
		profile: "See your name",
		email: "See your email address",
		offline_access: "Stay connected until you revoke it",
		content: "Read and edit posts, project pages and images",
	};

	async function answer(accept: boolean) {
		busy = true;
		failure = "";
		const { data: result, error } = await authClient.oauth2.consent({ accept });
		if (error) {
			failure = error.message ?? "Something went wrong";
			busy = false;
			return;
		}
		const target = (result as { url?: string; redirect_uri?: string } | null)?.url;
		if (target) {
			location.href = target;
		}
	}
</script>

<svelte:head>
	<title>Allow access | orochibraru admin</title>
	<meta name="robots" content="noindex">
</svelte:head>

<main data-admin class="grid min-h-dvh place-items-center px-4">
	<div class="w-full max-w-md">
		<div class="mb-6 flex items-center gap-3">
			<span class="grid size-8 place-items-center bg-neon font-mono text-lg font-bold text-onneon" aria-hidden="true">&#3647;</span>
			<h1 class="text-lg font-semibold">Allow {data.client || "this app"} access?</h1>
		</div>
		<div class="apanel p-5">
			<p class="text-sm text-dim">
				It will act as <strong class="text-fg">{data.admin.email}</strong> on this site, and be able to:
			</p>
			<ul class="my-4 grid gap-2 text-sm">
				{#each data.scopes as scope (scope)}
					<li class="status status-on normal-case">{DESCRIPTIONS[scope] ?? scope}</li>
				{/each}
			</ul>
			<p class="mb-5 text-xs text-dim">Revoke it any time under Connections.</p>
			<div class="grid grid-cols-2 gap-2">
				<button class="abtn h-9" type="button" disabled={busy} onclick={() => answer(false)}>Deny</button>
				<button class="abtn abtn-primary h-9" type="button" disabled={busy} onclick={() => answer(true)}>Allow</button>
			</div>
			{#if failure}
				<p class="mt-4 text-sm text-plasma" role="alert">{failure}</p>
			{/if}
		</div>
	</div>
</main>
