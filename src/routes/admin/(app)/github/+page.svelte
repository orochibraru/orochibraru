<script lang="ts">
	import { enhance } from "$app/forms";

	let { data, form } = $props();
	let organization = $state("");
	const action = $derived(
		organization && data.orgTarget
			? data.orgTarget.replace("ORG", encodeURIComponent(organization))
			: data.target,
	);
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
		<form method="POST" action="?/reconcile" use:enhance>
			<button class="btn" type="submit">Sync every project now</button>
		</form>
	</div>
	{#if form?.message}
		<p class="mb-5 text-plasma" role="alert">{form.message}</p>
	{:else if form?.reconciled}
		<p class="mb-5 text-acid" role="status">Checked every project; see the overview for runs.</p>
	{/if}
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
