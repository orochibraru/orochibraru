<script lang="ts">
	import { enhance } from "$app/forms";

	let { data } = $props();
</script>

<svelte:head>
	<title>Connections | orochibraru admin</title>
</svelte:head>

<h1 class="mb-3 text-3xl font-extrabold tracking-[-.03em]">Connections</h1>
<p class="mb-8 max-w-[72ch] text-dim">
	Add <code class="text-cyan">{data.endpoint}</code> as a custom connector in claude.ai or the desktop
	app, or run <code class="text-cyan">claude mcp add --transport http orochibraru {data.endpoint}</code>.
	Claude sends you through the SSO sign-in once, then appears here.
</p>

<div class="grid gap-px border border-line bg-line">
	{#each data.connections as connection (connection.clientId)}
		<div class="flex flex-wrap items-center gap-4 bg-surface px-5 py-4">
			<span class="font-semibold">{connection.name}</span>
			{#if connection.disabled}
				<span class="chip">revoked</span>
			{:else}
				<span class="text-[.85rem] text-dim">
					{connection.activeGrants} active grant{connection.activeGrants === 1 ? "" : "s"}{connection.lastAuthorized
						? `, last authorized ${connection.lastAuthorized.toLocaleString()}`
						: ""}
				</span>
				<form class="ml-auto" method="POST" action="?/revoke" use:enhance>
					<input type="hidden" name="clientId" value={connection.clientId}>
					<button class="btn" type="submit">Revoke</button>
				</form>
			{/if}
		</div>
	{:else}
		<p class="bg-surface px-5 py-4 text-dim">Nothing connected yet.</p>
	{/each}
</div>
