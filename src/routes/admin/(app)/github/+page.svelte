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

<h1 class="mb-3 text-3xl font-extrabold tracking-[-.03em]">GitHub</h1>

{#if !data.app}
	<p class="mb-6 max-w-[72ch] text-dim">
		Docs sync through a GitHub App this site creates for itself: read-only access to contents,
		and one webhook that fires on push. Nothing is written to your repos.
	</p>
	<!-- the manifest flow is a plain form post to GitHub; it comes back to /admin/github/callback -->
	<form class="admin-form flex max-w-xl flex-col gap-4" method="POST" action={action}>
		<input type="hidden" name="manifest" value={data.manifest}>
		<label>
			Organisation, if the repos belong to one (leave empty for your own account)
			<input bind:value={organization} placeholder="my-org">
		</label>
		<button class="btn btn-primary self-start" type="submit">Create the GitHub App</button>
	</form>
{:else}
	<p class="mb-6 text-dim">
		App <a class="text-cyan" href={data.app.settingsUrl} target="_blank" rel="noopener">{data.app.slug}</a>
		{data.app.installed ? "is installed." : "exists but isn't installed yet."}
	</p>
	<div class="mb-10 flex flex-wrap gap-3">
		<a class="btn btn-primary" href={data.app.installUrl} target="_blank" rel="noopener"
			>{data.app.installed ? "Choose repos" : "Install the app"}</a
		>
		<form method="POST" action="?/refresh" use:enhance>
			<button class="btn" type="submit">Refresh the repo list</button>
		</form>
		<button class="btn" type="button" onclick={syncAll} disabled={syncing}>
			{syncing ? "Syncing…" : "Sync every project now"}
		</button>
	</div>
	{#if form?.message}
		<p class="mb-5 text-plasma" role="alert">{form.message}</p>
	{/if}
	<!-- a modal <dialog> already traps focus, closes on Escape and draws the backdrop -->
	<dialog
		bind:this={dialog}
		aria-labelledby="sync-title"
		class="w-[min(48rem,calc(100vw-2rem))] max-w-none border border-line bg-surface p-0 text-fg backdrop:bg-black/50"
	>
		<div class="flex h-14 items-center justify-between border-b border-line pr-3 pl-5">
			<h2 id="sync-title" class="text-[11px] tracking-[.18em] text-plasma uppercase">
				{syncing ? "Syncing every project…" : "Sync finished"}
			</h2>
			<button
				type="button"
				aria-label="Close"
				class="grid size-9 place-items-center border border-edge transition hover:border-acid hover:text-acid"
				onclick={() => dialog?.close()}
			>
				<X class="size-4" aria-hidden="true" />
			</button>
		</div>
		<pre
			bind:this={output}
			class="h-[min(28rem,60dvh)] overflow-auto p-5 font-mono text-[.8rem] leading-relaxed whitespace-pre-wrap"
			aria-live="polite">{#each lines as line, index (index)}<span
					class={line.includes("✗") ? "text-plasma" : line.includes("✓") ? "text-acid" : ""}
					>{line}</span
				>{"\n"}{/each}</pre>
	</dialog>
	<h2 class="mb-3 text-xl font-bold">Repos not yet a project</h2>
	{#each data.repos as repo (repo)}
		<p class="font-mono text-[.9rem]">{repo}</p>
	{:else}
		<p class="text-dim">None: every repo the app can read already has a project.</p>
	{/each}
	<form
		class="mt-14"
		method="POST"
		action="?/forget"
		use:enhance={({ cancel }) => {
			if (!confirm("Forget this app here? It stays on GitHub until you delete it there.")) {
				cancel();
			}
		}}
	>
		<button class="text-[.85rem] text-dim hover:text-plasma" type="submit">Forget this app</button>
	</form>
{/if}
