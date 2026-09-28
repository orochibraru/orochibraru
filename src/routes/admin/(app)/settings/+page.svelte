<script lang="ts">
	import { RefreshCw } from "@lucide/svelte";
	import type { SubmitFunction } from "@sveltejs/kit";
	import { enhance } from "$app/forms";

	let { data, form } = $props();

	// which form's refresh is running, for its spinner
	let refreshing = $state<string | null>(null);
	const track: SubmitFunction = ({ action }) => {
		if (action.search.includes("refresh")) {
			refreshing = action.search;
		}
		return async ({ update }) => {
			await update();
			refreshing = null;
		};
	};
</script>

<svelte:head>
	<title>Settings | orochibraru admin</title>
</svelte:head>

{#snippet status(saved: boolean, problem: Promise<string | null> | undefined)}
	{#if !saved || !problem}
		<span class="status">not set</span>
	{:else}
		{#await problem}
			<span class="status status-busy">checking</span>
		{:then reason}
			<span class={["status", reason ? "status-bad" : "status-on"]}>{reason ? "failing" : "connected"}</span>
		{/await}
	{/if}
{/snippet}

{#snippet problemText(problem: Promise<string | null> | undefined)}
	{#await problem then reason}
		{#if reason}
			<p class="border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">{reason}</p>
		{/if}
	{/await}
{/snippet}

{#snippet refresh(action: string)}
	<button class="abtn" type="submit" formaction={action} formnovalidate disabled={!!refreshing}>
		<RefreshCw class={["size-3.5", refreshing === action && "animate-spin"]} aria-hidden="true" />
		Refresh connection
	</button>
{/snippet}

<div class="mb-5 flex min-h-8 items-center gap-4">
	<h1 class="text-base font-semibold">Settings</h1>
	<p class="text-sm text-dim">Credentials for the services the admin reads from, sealed at rest.</p>
</div>

<div class="grid gap-4 lg:grid-cols-2">
	<section class="apanel">
		<header>
			Umami
			{@render status(!!data.umami, data.umamiProblem)}
		</header>
		<form class="admin-form grid gap-3 p-3" method="POST" action="?/umami" use:enhance={track}>
			<p class="text-xs text-dim">A self-hosted Umami v3: its visitor stats show on the overview and the analytics page.</p>
			<label>
				Umami URL
				<input name="url" type="url" required placeholder="https://umami.example.com" value={data.umami?.url ?? ""}>
			</label>
			<label>
				Website ID
				<input name="websiteId" required placeholder="From the tracking script" value={data.umami?.websiteId ?? ""}>
			</label>
			<label>
				API key
				<input
					name="apiKey"
					type="password"
					autocomplete="off"
					required={!data.umami}
					placeholder={data.umami ? "Saved: leave blank to keep it" : "Your Umami API key"}
				>
			</label>
			{#if form?.umamiError}
				<p class="text-sm text-hot" role="alert">{form.umamiError}</p>
			{/if}
			{@render problemText(data.umamiProblem)}
			<div class="flex flex-wrap gap-2">
				<button class="abtn abtn-primary" type="submit">Save</button>
				{#if data.umami}
					{@render refresh("?/refreshUmami")}
					<button class="abtn abtn-danger ml-auto" type="submit" formaction="?/forgetUmami" formnovalidate>Disconnect</button>
				{/if}
			</div>
		</form>
	</section>

	<section class="apanel">
		<header>
			Google Search Console
			{@render status(!!data.search, data.searchProblem)}
		</header>
		<form class="admin-form grid gap-3 p-3" method="POST" action="?/searchConsole" use:enhance={track}>
			<p class="text-xs text-dim">
				In Google Cloud, enable the Search Console API and create a service account with a JSON key: it needs no
				IAM role. In Search Console, add its email as a Restricted user of the property.
			</p>
			{#if data.search}
				<p class="text-xs text-dim">Service account: <span class="font-mono text-fg select-all">{data.search.email}</span></p>
			{/if}
			<label>
				Property
				<input name="site" required placeholder={data.searchPlaceholder} value={data.search?.site ?? ""}>
			</label>
			<label>
				Service account key
				<textarea
					class="font-mono text-xs"
					name="serviceAccount"
					rows="3"
					autocomplete="off"
					spellcheck="false"
					required={!data.search}
					placeholder={data.search ? "Saved: leave blank to keep it" : "The whole JSON file"}
				></textarea>
			</label>
			{#if form?.searchError}
				<p class="text-sm text-hot" role="alert">{form.searchError}</p>
			{/if}
			{@render problemText(data.searchProblem)}
			<div class="flex flex-wrap gap-2">
				<button class="abtn abtn-primary" type="submit">Save</button>
				{#if data.search}
					{@render refresh("?/refreshSearchConsole")}
					<button class="abtn abtn-danger ml-auto" type="submit" formaction="?/forgetSearchConsole" formnovalidate>Disconnect</button>
				{/if}
			</div>
		</form>
	</section>
</div>
