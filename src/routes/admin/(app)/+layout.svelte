<script lang="ts">
	import { page } from "$app/state";
	import { authClient } from "$lib/auth-client";

	let { data, children } = $props();

	const NAV = [
		["/admin", "Overview"],
		["/admin/posts", "Posts"],
		["/admin/projects", "Projects"],
		["/admin/images", "Images"],
		["/admin/github", "GitHub"],
		["/admin/connections", "Connections"],
	] as const;

	const current = (href: string) =>
		href === "/admin" ? page.url.pathname === href : page.url.pathname.startsWith(href);

	async function signOut() {
		await authClient.signOut();
		location.href = "/";
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex">
</svelte:head>

<div class="admin mx-auto max-w-page px-6 pt-8 pb-22.5">
	<nav class="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-4 text-[.9rem]">
		<span class="tag">Admin</span>
		{#each NAV as [href, label] (href)}
			<a
				{href}
				class={["hover:text-acid", current(href) ? "text-acid" : "text-dim"]}
				aria-current={current(href) ? "page" : undefined}>{label}</a
			>
		{/each}
		<span class="ml-auto text-dim">{data.admin.email}</span>
		<button class="text-dim hover:text-acid" type="button" onclick={signOut}>Sign out</button>
	</nav>
	{@render children()}
</div>
