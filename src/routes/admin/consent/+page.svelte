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

<main class="mx-auto max-w-page px-6">
	<div class="max-w-xl pt-15 pb-22.5">
		<span class="tag">Connect an app</span>
		<h1 class="mt-6 text-[clamp(2rem,5vw,3rem)]/none font-extrabold tracking-[-.03em]">
			Allow access?
		</h1>
		<p class="mt-6 text-dim">
			<strong class="text-fg">{data.client || "An app"}</strong> wants to act as
			<strong class="text-fg">{data.admin.email}</strong> on this site. It will be able to:
		</p>
		<ul class="mt-5 list-disc pl-4.5 text-dim marker:text-acid">
			{#each data.scopes as scope (scope)}
				<li class="mb-2">{DESCRIPTIONS[scope] ?? scope}</li>
			{/each}
		</ul>
		<p class="mt-5 text-[.9rem] text-dim">You can revoke it any time under Connections.</p>
		<div class="mt-8 flex gap-3">
			<button class="btn btn-primary" type="button" disabled={busy} onclick={() => answer(true)}>
				Allow
			</button>
			<button class="btn" type="button" disabled={busy} onclick={() => answer(false)}>Deny</button>
		</div>
		{#if failure}
			<p class="mt-4 text-plasma" role="alert">{failure}</p>
		{/if}
	</div>
</main>
