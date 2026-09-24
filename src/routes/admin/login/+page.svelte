<script lang="ts">
	import { page } from "$app/state";
	import { authClient } from "$lib/auth-client";
	import Logo from "$lib/components/Logo.svelte";

	let { data } = $props();
	let busy = $state(false);
	let failure = $state("");

	// Only same-site paths: `next` comes from the URL, so it is anyone's to write.
	const next = $derived.by(() => {
		const target = page.url.searchParams.get("next") ?? "/admin";
		return target.startsWith("/") && !target.startsWith("//") ? target : "/admin";
	});

	async function signIn() {
		busy = true;
		failure = "";
		const { error } = await authClient.signIn.social({ provider: "sso", callbackURL: next });
		if (error) {
			failure = error.message ?? "Sign-in failed";
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in | orochibraru admin</title>
	<meta name="robots" content="noindex">
</svelte:head>

<main data-admin class="grid min-h-dvh place-items-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-6 flex items-center gap-3">
			<span class="grid size-8 place-items-center rounded-lg bg-spark text-onspark" aria-hidden="true"><Logo mono class="size-5" /></span>
			<h1 class="text-lg font-semibold">Sign in to the admin</h1>
		</div>
		<div class="apanel p-5">
			{#if data.signedInAs}
				<p class="mb-5 text-sm text-dim">
					<strong class="text-fg">{data.signedInAs}</strong> isn&rsquo;t on the admin allowlist. Sign in
					with another account.
				</p>
			{:else}
				<p class="mb-5 text-sm text-dim">The admin and the MCP server both use your SSO account.</p>
			{/if}
			<button class="abtn abtn-primary h-9 w-full" type="button" disabled={busy} onclick={signIn}>
				{busy ? "Redirecting…" : "Continue with SSO"}
			</button>
			{#if failure}
				<p class="mt-4 text-sm text-hot" role="alert">{failure}</p>
			{/if}
		</div>
	</div>
</main>
