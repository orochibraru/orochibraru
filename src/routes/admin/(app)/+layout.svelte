<script lang="ts">
	import { ExternalLink, LogOut, Search } from "@lucide/svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { authClient } from "$lib/auth-client";
	import Palette, { type Command } from "$lib/components/admin/Palette.svelte";
	import Logo from "$lib/components/Logo.svelte";

	let { data, children } = $props();

	const NAV = [
		[resolve("/admin"), "Overview"],
		[resolve("/admin/posts"), "Posts"],
		[resolve("/admin/projects"), "Projects"],
		[resolve("/admin/images"), "Images"],
		[resolve("/admin/github"), "GitHub"],
		[resolve("/admin/connections"), "Connections"],
	] as const;

	const current = (href: string) =>
		href === resolve("/admin") ? page.url.pathname === href : page.url.pathname.startsWith(href);

	let palette = $state<Palette>();
	let newPost = $state<HTMLFormElement>();

	const commands = $derived<Command[]>([
		{ label: "New post", kind: "Action", run: () => newPost?.requestSubmit() },
		...NAV.map(([href, label]) => ({ label, kind: "Page", run: () => goto(href) })),
		...data.jump.posts.map((post) => ({
			label: post.title,
			kind: post.status === "draft" ? "Draft post" : "Post",
			run: () => goto(resolve("/admin/(app)/posts/[id]", { id: String(post.id) })),
		})),
		...data.jump.projects.map((project) => ({
			label: project.name,
			kind: "Project",
			run: () => goto(resolve("/admin/(app)/projects/[repo]", { repo: project.repo })),
		})),
	]);

	// ⌘S saves whichever form on the page is marked as the one to save
	function onWindowKeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
			const form = document.querySelector<HTMLFormElement>("form[data-save]");
			if (form) {
				event.preventDefault();
				form.requestSubmit();
			}
		}
	}

	// a save that went through says so briefly, whichever editor it came from
	let saved = $state(false);
	$effect(() => {
		if (!page.form?.saved) {
			return;
		}
		saved = true;
		const timer = setTimeout(() => {
			saved = false;
		}, 1800);
		return () => clearTimeout(timer);
	});

	async function signOut() {
		await authClient.signOut();
		location.href = "/";
	}
</script>

<svelte:head>
	<meta name="robots" content="noindex">
</svelte:head>

<svelte:window onkeydown={onWindowKeydown} />

<div data-admin class="flex min-h-dvh flex-col">
	<header
		class="sticky top-0 z-20 flex h-11 shrink-0 items-center gap-2 border-b border-line bg-bg/85 pr-2 pl-3 backdrop-blur"
	>
		<a
			class="grid size-6 shrink-0 place-items-center rounded-md bg-spark text-onspark"
			href={resolve("/admin")}
			aria-label="Overview"><Logo mono class="size-4" /></a
		>
		<nav class="-mb-px flex h-full min-w-0 overflow-x-auto" aria-label="Admin">
			{#each NAV as [href, label] (href)}
				<a
					{href}
					class={[
						"flex h-full items-center px-2.5 text-[.8125rem] whitespace-nowrap transition-colors",
						current(href)
							? "text-fg shadow-[inset_0_-2px_0_var(--color-spark)]"
							: "text-dim hover:text-fg",
					]}
					aria-current={current(href) ? "page" : undefined}>{label}</a
				>
			{/each}
		</nav>
		<button
			type="button"
			class="ml-auto flex h-7 shrink-0 items-center gap-2 border border-line bg-surface px-2 text-[.8125rem] text-dim transition-colors hover:border-edge hover:text-fg sm:w-60"
			onclick={() => palette?.open()}
		>
			<Search class="size-3.5" aria-hidden="true" />
			<span class="hidden flex-1 text-left sm:inline">Jump to…</span>
			<span class="kbd hidden sm:inline-grid">⌘K</span>
		</button>
		<a
			class="grid size-7 shrink-0 place-items-center text-dim transition-colors hover:text-fg"
			href={resolve("/")}
			target="_blank"
			title="Open the site"
			aria-label="Open the site"
		>
			<ExternalLink class="size-3.5" aria-hidden="true" />
		</a>
		<button
			type="button"
			class="grid size-7 shrink-0 place-items-center text-dim transition-colors hover:text-hot"
			title="Sign out {data.admin.email}"
			aria-label="Sign out {data.admin.email}"
			onclick={signOut}
		>
			<LogOut class="size-3.5" aria-hidden="true" />
		</button>
	</header>

	<main class="w-full flex-1 px-4 pt-6 pb-16 sm:px-8">
		{@render children()}
	</main>
</div>

<form bind:this={newPost} hidden method="POST" action="{resolve('/admin/posts')}?/create"></form>
<Palette bind:this={palette} {commands} />
<p
	class={[
		"fixed right-4 bottom-4 z-30 border border-line bg-surface px-3 py-2 shadow-lg transition duration-200",
		saved ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
	]}
	role="status"
>
	{#if saved}<span class="status status-on">Saved</span>{/if}
</p>
