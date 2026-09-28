<script lang="ts">
	import { LoaderCircle } from "@lucide/svelte";
	import { SvelteSet } from "svelte/reactivity";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { ago, statusClass } from "$lib/admin";
	import Confirm from "$lib/components/admin/Confirm.svelte";
	import type { SyncEvent } from "./sync/+server";

	let { data, form } = $props();
	let organization = $state("");
	const action = $derived(
		organization && data.orgTarget
			? data.orgTarget.replace("ORG", encodeURIComponent(organization))
			: data.target,
	);

	let confirmer = $state<Confirm>();

	const SIGN = { added: "+", changed: "~", removed: "−" } as const;

	let tab = $state("overview");
	const history = $derived(data.history.find((group) => group.repo === tab));

	// while "sync every project" runs, each project spins until the server says it's done
	let syncing = $state(false);
	const pending = new SvelteSet<string>();
	let failures = $state<Record<string, string>>({});
	let problem = $state("");

	async function syncAll() {
		syncing = true;
		problem = "";
		failures = {};
		for (const row of data.overview) {
			pending.add(row.repo);
		}
		try {
			const response = await fetch("/admin/github/sync", { method: "POST" });
			if (!response.ok || !response.body) {
				problem = `The sync didn't start: ${response.status} ${response.statusText}`;
				return;
			}
			let rest = "";
			for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
				const lines = (rest + chunk).split("\n");
				rest = lines.pop() ?? "";
				for (const line of lines.filter(Boolean)) {
					const event = JSON.parse(line) as SyncEvent;
					if (!event.repo) {
						problem = event.error ?? "The sync failed";
						continue;
					}
					pending.delete(event.repo);
					if (event.error) {
						failures[event.repo] = event.error;
					}
					// that project's row catches up now, not when the whole run ends
					await invalidateAll();
				}
			}
		} catch (cause) {
			problem = `The connection dropped: ${cause}`;
		} finally {
			pending.clear();
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
			{#if syncing}<LoaderCircle class="size-3.5 animate-spin" aria-hidden="true" />{/if}
			{syncing ? "Syncing…" : "Sync every project"}
		</button>
	</div>
	{#if form?.message}
		<p class="mb-4 border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">{form.message}</p>
	{/if}
	{#if problem}
		<p class="mb-4 border border-hot/40 bg-hot/8 px-3 py-2 text-sm text-hot" role="alert">{problem}</p>
	{/if}
	<section class="apanel">
		<header>Repos not yet a project</header>
		{#each data.repos as repo (repo)}
			<p class="border-b border-line px-3 py-2.5 font-mono text-[.8125rem] last:border-b-0">{repo}</p>
		{:else}
			<p class="px-3 py-8 text-center text-sm text-dim">None: every repo the app can read already has a project.</p>
		{/each}
	</section>

	<h2 class="mt-8 mb-3 text-sm font-semibold">Update history</h2>
	<div class="-mb-px flex overflow-x-auto" role="tablist" aria-label="Update history">
		{#each [{ repo: "overview", name: "Overview" }, ...data.overview] as item (item.repo)}
			<button
				type="button"
				role="tab"
				aria-selected={tab === item.repo}
				class={[
					"flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors",
					tab === item.repo ? "border-spark text-fg" : "border-transparent text-dim hover:text-fg",
				]}
				onclick={() => (tab = item.repo)}
			>
				{item.name}
				{#if item.repo === "overview" ? syncing : pending.has(item.repo)}
					<LoaderCircle class="size-3 animate-spin text-dim" aria-label="syncing" />
				{/if}
			</button>
		{/each}
	</div>
	<section class="apanel rounded-tl-none" role="tabpanel">
		{#if tab === "overview"}
			<div class="overflow-x-auto">
				<table class="atable">
					<thead>
						<tr>
							<th>Project</th>
							<th>Last sync</th>
							<th>Channel</th>
							<th>Commit</th>
							<th class="text-right">Files</th>
							<th class="text-right">When</th>
						</tr>
					</thead>
					<tbody>
						{#each data.overview as row (row.repo)}
							{@const error = failures[row.repo] ?? row.run?.error}
							<tr>
								<td class="w-full">
									<button type="button" class="row-link text-left" onclick={() => (tab = row.repo)}>{row.name}</button>
									<span class="block font-mono text-xs text-dim">{row.githubRepo}</span>
									{#if error}
										<span class="block max-w-xl truncate text-xs text-hot" title={error}>{error}</span>
									{/if}
								</td>
								<td class="whitespace-nowrap">
									{#if pending.has(row.repo)}
										<span class="inline-flex items-center gap-1.5 text-[13px] text-dim"
											><LoaderCircle class="size-3.5 animate-spin" aria-hidden="true" /> syncing</span
										>
									{:else if row.run}
										<span class={statusClass(failures[row.repo] ? "failed" : row.run.status)}
											>{failures[row.repo] ? "failed" : row.run.status}</span
										>
									{:else}
										<span class="status">never</span>
									{/if}
								</td>
								<td class="text-xs text-dim">{row.run?.channel ?? ""}</td>
								<td class="font-mono text-xs text-dim">{row.run?.sha?.slice(0, 7) ?? ""}</td>
								<td class="text-right font-mono text-xs text-dim">{row.run?.status === "ok" ? row.run.changed : ""}</td>
								<td class="text-right text-xs whitespace-nowrap text-dim" title={row.run?.startedAt.toLocaleString()}
									>{row.run ? ago(row.run.startedAt) : ""}</td
								>
							</tr>
						{:else}
							<tr>
								<td class="py-8 text-center text-dim" colspan="6">No project is linked to a repo yet.</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			{#if pending.has(tab)}
				<p class="flex items-center gap-2 border-b border-line px-3 py-2 text-[13px] text-dim">
					<LoaderCircle class="size-3.5 animate-spin" aria-hidden="true" /> Syncing…
				</p>
			{/if}
			{#if history}
				{#each history.runs as run (run.id)}
					<div class="border-b border-line last:border-b-0">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
							<span class={statusClass(run.status)}>{run.status}</span>
							{#if run.channel}
								<span class="rounded border border-line px-1.5 text-xs text-dim">{run.channel}</span>
							{/if}
							{#if run.sha}
								<code class="text-xs text-dim">{run.sha.slice(0, 7)}</code>
							{/if}
							{#if run.status === "ok"}
								<span class="text-dim">{run.changed} file{run.changed === 1 ? "" : "s"}</span>
							{/if}
							<span class="ml-auto text-xs whitespace-nowrap text-dim" title={run.startedAt.toLocaleString()}>{ago(run.startedAt)}</span>
						</div>
						{#if run.error}
							<pre class="mx-3 mb-2 overflow-x-auto border border-hot/30 bg-hot/5 p-2 font-mono text-xs whitespace-pre-wrap text-hot">{run.error}</pre>
						{/if}
						{#each run.changes as change (change.id)}
							<details class="group border-t border-line">
								<summary class="flex cursor-pointer items-center gap-2 px-3 py-1.5 font-mono text-xs hover:bg-fg/3">
									<span
										class={["w-3 text-center font-semibold", change.kind === "removed" ? "text-hot" : change.kind === "added" ? "text-cool" : "text-dim"]}
										title={change.kind}>{SIGN[change.kind]}</span
									>
									<span class="truncate">{change.path}</span>
								</summary>
								{#if change.diff}
									<pre class="overflow-x-auto border-t border-line bg-bg py-2 font-mono text-xs/relaxed">{#each change.diff.split("\n") as line, index (index)}<span
												class={[
													"block px-3",
													line.startsWith("@@") && "text-dim",
													line.startsWith("+") && "bg-cool/10 text-cool",
													line.startsWith("-") && "bg-hot/8 text-hot",
												]}>{line || " "}</span
											>{/each}</pre>
								{:else if change.diff === null}
									<p class="border-t border-line bg-bg px-3 py-2 text-xs text-dim">An image: no text diff.</p>
								{:else}
									<p class="border-t border-line bg-bg px-3 py-2 text-xs text-dim">Empty file.</p>
								{/if}
							</details>
						{/each}
						{#if run.status === "ok" && !run.changes.length}
							<p class="border-t border-line px-3 py-2 text-xs text-dim">Synced before the history kept diffs.</p>
						{/if}
					</div>
				{/each}
			{:else}
				<p class="px-3 py-8 text-center text-sm text-dim">No sync has changed anything here yet.</p>
			{/if}
		{/if}
	</section>
	<form
		class="mt-16 flex items-center gap-3 border-t border-line pt-4 text-sm text-dim"
		method="POST"
		action="?/forget"
		use:enhance
	>
		<span>Forgetting the app here leaves it on GitHub until you delete it there.</span>
		<button
			class="abtn abtn-danger ml-auto"
			type="submit"
			onclick={(event) =>
				confirmer?.guard(event, {
					title: "Forget this GitHub App?",
					body: "It stays installed on GitHub until you delete it there.",
					action: "Forget app",
				})}>Forget this app</button
		>
	</form>
{/if}

<Confirm bind:this={confirmer} />
