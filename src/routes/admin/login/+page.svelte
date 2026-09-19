<script lang="ts">
	import { page } from "$app/state";
	import { authClient } from "$lib/auth-client";

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

<main class="mx-auto max-w-page px-6">
	<div class="max-w-xl pt-15 pb-22.5">
		<span class="tag">Admin</span>
		<h1 class="mt-6 text-[clamp(2.2rem,6vw,3.4rem)]/none font-extrabold tracking-[-.03em]">
			Sign in
		</h1>
		{#if data.signedInAs}
			<p class="mt-6 text-dim">
				Signed in as <strong class="text-fg">{data.signedInAs}</strong>, which isn&rsquo;t on the
				admin allowlist. Sign in with another account below.
			</p>
		{:else}
			<p class="mt-6 text-dim">The admin area and the MCP server use your SSO account.</p>
		{/if}
		<button class="btn btn-primary mt-8" type="button" disabled={busy} onclick={signIn}>
			{busy ? "Redirecting…" : "Sign in with SSO"}
		</button>
		{#if failure}
			<p class="mt-4 text-plasma" role="alert">{failure}</p>
		{/if}
	</div>
</main>
