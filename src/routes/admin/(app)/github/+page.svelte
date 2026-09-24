<script lang="ts">
	import { X } from "@lucide/svelte";
	import { tick } from "svelte";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";

	let { data, form } = $props();
	let organization = $state("");
	const action = $derived(
		organization && data.orgTarget
			? data.orgTarget.replace("ORG", encodeURIComponent(organization))
			: data.target,
	);

	let dialog = $state<HTMLDialogElement>();
	let output = $state<HTMLPreElement>();
	let lines = $state<string[]>([]);
	let syncing = $state(false);

	async function syncAll() {
		lines = [];
		syncing = true;
		dialog?.showModal();
		const say = async (line: string) => {
			lines.push(line);
			await tick();
			output?.scrollTo({ top: output.scrollHeight });
		};
		try {
			const response = await fetch("/admin/github/sync", { method: "POST" });
			if (!response.ok || !response.body) {
				await say(`✗ ${response.status} ${response.statusText}`);
				return;
			}
			let pending = "";
			for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
				const parts = (pending + chunk).split("\n");
				pending = parts.pop() ?? "";
				for (const line of parts) {
					await say(line);
				}
			}
		} catch (cause) {
			await say(`✗ the connection dropped: ${cause}`);
		} finally {
			syncing = false;
			await invalidateAll();
		}
	}
</script>

<svelte:head>
	<title>GitHub | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 items-center gap-4">
	<h1 class="text-base font-semibold">GitHub</h1>
	{#if data.app}
		<span class={data.app.installed ? "status status-on" : "status"}>{data.app.installed ? "installed" : "not installed"}</span>
	{/if}
</div>

{#if !data.app}
	<div class="apanel max-w-xl p-5">
		<p class="mb-5 text-sm text-dim">
			Docs sync through a GitHub App this site creates for itself: read-only access to contents,
			and one webhook that fires on push. Nothing is written to your repos.
		</p>
		<!-- the manifest flow is a plain form post to GitHub; it comes back to /admin/github/callback -->
		<form class="admin-form flex flex-col gap-4" method="POST" action={action}>
			<input type="hidden" name="manifest" value={data.manifest}>
			<label>
				Organisation, if the repos belong to one. Leave empty for your own account.
				<input bind:value={organization} placeholder="my-org">
			</label>
			<button class="abtn abtn-primary self-start" type="submit">Create the GitHub App</button>
		</form>
	</div>
{:else}
	<div class="apanel mb-4 flex flex-wrap items-center gap-3 p-3">
		<p class="mr-auto text-sm text-dim">
			App <a class="font-mono text-fg hover:underline" href={data.app.settingsUrl} target="_blank" rel="noopener">{data.app.slug}</a>
			{data.app.installed ? "can read the repos below." : "exists but isn't installed yet."}
		</p>
		<a class="abtn abtn-primary" href={data.app.installUrl} target="_blank" rel="noopener"
			>{data.app.installed ? "Choose repos" : "Install the app"}</a
		>
		<form method="POST" action="?/refresh" use:enhance>
			<button class="abtn" type="submit">Refresh repo list</button>
		</form>
		<button class="abtn" type="button" onclick={syncAll} disabled={syncing}>
			{syncing ? "Syncing…" : "Sync every project"}
		</button>
	</div>
	{#if form?.message}
		<p class="mb-4 border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">{form.message}</p>
	{/if}
	<!-- a modal <dialog> already traps focus, closes on Escape and draws the backdrop -->
	<dialog
		bind:this={dialog}
		aria-labelledby="sync-title"
		class="m-auto w-[min(48rem,calc(100vw-2rem))] max-w-none border border-edge bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/40"
	>
		<div class="flex h-11 items-center justify-between border-b border-line pr-2 pl-4">
			<h2 id="sync-title" class={syncing ? "status status-busy text-fg" : "status status-on"}>
				{syncing ? "Syncing every project" : "Sync finished"}
			</h2>
			<button
				type="button"
				aria-label="Close"
				class="grid size-7 place-items-center text-dim hover:text-fg"
				onclick={() => dialog?.close()}
			>
				<X class="size-4" aria-hidden="true" />
			</button>
		</div>
		<pre
			bind:this={output}
			class="h-[min(28rem,60dvh)] overflow-auto bg-bg p-4 font-mono text-xs/relaxed whitespace-pre-wrap"
			aria-live="polite">{#each lines as line, index (index)}<span
					class={line.includes("✗") ? "text-hot" : line.includes("✓") ? "text-accent" : ""}
					>{line}</span
				>{"\n"}{/each}</pre>
	</dialog>
	<section class="apanel">
		<header>Repos not yet a project</header>
		{#each data.repos as repo (repo)}
			<p class="border-b border-line px-3 py-2.5 font-mono text-[.8125rem] last:border-b-0">{repo}</p>
		{:else}
			<p class="px-3 py-8 text-center text-sm text-dim">None: every repo the app can read already has a project.</p>
		{/each}
	</section>
	<form
		class="mt-16 flex items-center gap-3 border-t border-line pt-4 text-sm text-dim"
		method="POST"
		action="?/forget"
		use:enhance={({ cancel }) => {
			if (!confirm("Forget this app here? It stays on GitHub until you delete it there.")) {
				cancel();
			}
		}}
	>
		<span>Forgetting the app here leaves it on GitHub until you delete it there.</span>
		<button class="abtn abtn-danger ml-auto" type="submit">Forget this app</button>
	</form>
{/if}
