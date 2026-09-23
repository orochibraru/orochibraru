<script lang="ts">
	import { enhance } from "$app/forms";
	import { ago, statusClass } from "$lib/admin";

	let { data } = $props();
</script>

<svelte:head>
	<title>Connections | orochibraru admin</title>
</svelte:head>

<div class="mb-5 flex min-h-8 items-center gap-4">
	<h1 class="text-base font-semibold">Connections</h1>
	<p class="text-sm text-dim">Apps that can edit this site over MCP.</p>
</div>

<div class="apanel mb-4 grid gap-2 p-4 text-[.8125rem] text-dim">
	<p>Add this as a custom connector in claude.ai or the desktop app. Claude sends you through SSO once, then shows up below.</p>
	<code class="block overflow-x-auto border border-line bg-bg px-3 py-2 font-mono text-fg select-all">{data.endpoint}</code>
	<p>Or from a terminal:</p>
	<code class="block overflow-x-auto border border-line bg-bg px-3 py-2 font-mono whitespace-nowrap text-fg select-all">claude mcp add --transport http orochibraru {data.endpoint}</code>
</div>

<div class="apanel overflow-x-auto">
	<table class="atable">
		<thead>
			<tr>
				<th>App</th>
				<th>Status</th>
				<th>Grants</th>
				<th>Last authorized</th>
				<th><span class="sr-only">Actions</span></th>
			</tr>
		</thead>
		<tbody>
			{#each data.connections as connection (connection.clientId)}
				<tr>
					<td class="w-full font-medium">{connection.name}</td>
					<td>
						<span class={statusClass(connection.disabled ? "revoked" : "ok")}>{connection.disabled ? "revoked" : "active"}</span>
					</td>
					<td class="text-dim">{connection.disabled ? "" : connection.activeGrants}</td>
					<td class="text-xs whitespace-nowrap text-dim" title={connection.lastAuthorized?.toLocaleString()}>
						{connection.lastAuthorized ? ago(connection.lastAuthorized) : "never"}
					</td>
					<td class="py-1.5">
						{#if !connection.disabled}
							<form method="POST" action="?/revoke" use:enhance>
								<input type="hidden" name="clientId" value={connection.clientId}>
								<button class="abtn abtn-danger h-7 text-xs" type="submit">Revoke</button>
							</form>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td class="py-10 text-center text-dim" colspan="5">Nothing connected yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
