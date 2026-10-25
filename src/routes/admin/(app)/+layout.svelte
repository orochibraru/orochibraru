<script lang="ts">
	import {
		Boxes,
		ChartLine,
		ChevronRight,
		Ellipsis,
		ExternalLink,
		FileText,
		GitBranch,
		LayoutDashboard,
		LogOut,
		Plug,
		Search,
		Settings,
	} from "@lucide/svelte";
	import { onMount } from "svelte";
	import { afterNavigate, goto, onNavigate } from "$app/navigation";
	import { asset, resolve } from "$app/paths";
	import { page } from "$app/state";
	import { authClient } from "$lib/auth-client";
	import Palette, { type Command } from "$lib/components/admin/Palette.svelte";
	import PullToRefresh from "$lib/components/admin/PullToRefresh.svelte";
	import Logo from "$lib/components/Logo.svelte";

	let { data, children } = $props();

	const NAV = [
		[resolve("/admin"), "Overview", LayoutDashboard],
		[resolve("/admin/analytics"), "Analytics", ChartLine],
		[resolve("/admin/posts"), "Posts", FileText],
		[resolve("/admin/projects"), "Projects", Boxes],
		[resolve("/admin/github"), "GitHub", GitBranch],
		[resolve("/admin/connections"), "Connections", Plug],
		[resolve("/admin/settings"), "Settings", Settings],
	] as const;

	const current = (href: string) =>
		href === resolve("/admin") ? page.url.pathname === href : page.url.pathname.startsWith(href);

	// on a phone: four tabs at the bottom, the rest behind More, as a native app has it
	const TABS = NAV.slice(0, 4);
	const MORE = NAV.slice(4);
	const section = $derived(NAV.find(([href]) => current(href)));
	const inMore = $derived(MORE.some(([href]) => current(href)));
	// a tab's own page, not an editor under it: only there may a pull reload the data
	const atTabRoot = $derived(NAV.some(([href]) => page.url.pathname === href));

	// iOS's large title: each page opens with its own heading, and the bar's small
	// title only fades in once that heading has scrolled away under it
	let scrolled = $state(0);

	let sheet = $state<HTMLDialogElement>();
	afterNavigate(() => sheet?.close());

	// Room for the notch and the home indicator: only while the admin is on screen,
	// the public site keeps the browser's own margins.
	onMount(() => {
		const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
		const before = viewport?.content;
		viewport?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
		return () => {
			if (viewport && before) {
				viewport.content = before;
			}
		};
	});

	// Pages slide like a navigation stack: deeper comes in from the right, back goes
	// out to it, a tab switch only fades. The root layout starts the transition; this
	// only says which way it goes, for app.css to pick the animation.
	const depth = (path: string) => path.split("/").filter(Boolean).length;
	onNavigate((navigation) => {
		const from = navigation.from?.url.pathname;
		const to = navigation.to?.url.pathname;
		if (!from || !to) {
			return;
		}
		document.documentElement.dataset.nav =
			from === to
				? "same"
				: depth(to) > depth(from)
					? "forward"
					: depth(to) < depth(from)
						? "back"
						: "tab";
	});

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
	<!-- added to a home screen, the admin opens as its own app, without the browser around it -->
	<link rel="manifest" href={asset("/admin/manifest.webmanifest")}>
	<link rel="apple-touch-icon" href={asset("/admin/icon-180.png")}>
	<meta name="mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-title" content="Admin">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
</svelte:head>

<svelte:window onkeydown={onWindowKeydown} bind:scrollY={scrolled} />

<div data-admin class="flex min-h-dvh flex-col md:pl-56">
	<!-- phones get an app's chrome: a title bar under the notch, tabs over the home indicator -->
	<header
		class={[
			"admin-chrome sticky top-0 z-20 shrink-0 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-colors md:hidden",
			scrolled > 4 ? "border-line bg-bg/80" : "border-transparent bg-bg",
		]}
		style:view-transition-name="admin-top"
	>
		<div class="grid h-12 grid-cols-[2.75rem_1fr_2.75rem] items-center px-1.5">
			<a
				class="grid size-11 place-items-center active:opacity-50"
				href={resolve("/admin")}
				aria-label="Overview"
				><span class="grid size-7 place-items-center rounded-lg bg-spark text-onspark"
					><Logo mono class="size-4.5" /></span
				></a
			>
			<p
				class="truncate text-center text-[1.0625rem] font-semibold transition-opacity duration-200"
				style:opacity={scrolled > 40 ? 1 : 0}
			>
				{section?.[1] ?? "Admin"}
			</p>
			<button
				type="button"
				class="grid size-11 place-items-center text-dim active:opacity-50"
				aria-label="Jump to…"
				onclick={() => palette?.open()}
			>
				<Search class="size-5" aria-hidden="true" />
			</button>
		</div>
	</header>

	<aside
		class="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-line bg-surface md:flex"
	>
		<a class="flex h-14 shrink-0 items-center gap-2.5 px-4" href={resolve("/admin")}>
			<span class="grid size-7 place-items-center rounded-md bg-spark text-onspark" aria-hidden="true"
				><Logo mono class="size-4.5" /></span
			>
			<span class="text-sm font-semibold">orochibraru</span>
		</a>
		<div class="px-3 pb-3">
			<button
				type="button"
				class="flex h-8 w-full items-center gap-2 rounded-lg border border-line bg-bg px-2 text-[.8125rem] text-dim transition-colors hover:border-edge hover:text-fg"
				onclick={() => palette?.open()}
			>
				<Search class="size-3.5" aria-hidden="true" />
				<span class="flex-1 text-left">Jump to…</span>
				<span class="kbd">⌘K</span>
			</button>
		</div>
		<nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Admin">
			{#each NAV as [href, label, Icon] (href)}
				<a
					{href}
					class={[
						"flex h-8 items-center gap-2.5 rounded-lg px-2 text-[.8125rem] transition-colors",
						current(href) ? "bg-fg/8 font-medium text-fg" : "text-dim hover:bg-fg/4 hover:text-fg",
					]}
					aria-current={current(href) ? "page" : undefined}
				>
					<Icon class={["size-4", current(href) && "text-spark"]} aria-hidden="true" />
					{label}
				</a>
			{/each}
		</nav>
		<div class="flex flex-col gap-0.5 border-t border-line p-3">
			<a
				class="flex h-8 items-center gap-2.5 rounded-lg px-2 text-[.8125rem] text-dim transition-colors hover:bg-fg/4 hover:text-fg"
				href={resolve("/")}
				target="_blank"
			>
				<ExternalLink class="size-4" aria-hidden="true" />
				Open the site
			</a>
			<button
				type="button"
				class="flex h-8 items-center gap-2.5 rounded-lg px-2 text-left text-[.8125rem] text-dim transition-colors hover:bg-fg/4 hover:text-hot"
				title="Sign out {data.admin.email}"
				onclick={signOut}
			>
				<LogOut class="size-4 shrink-0" aria-hidden="true" />
				<span class="min-w-0 flex-1 truncate">Sign out <span class="text-xs">{data.admin.email}</span></span>
			</button>
		</div>
	</aside>

	<main
		class="w-full flex-1 pt-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(6rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-8 md:pb-16"
		style:view-transition-name="admin-page"
	>
		{@render children()}
	</main>

	<nav
		class="admin-chrome fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
		style:view-transition-name="admin-tabs"
		aria-label="Admin"
	>
		<div class="grid h-14 grid-cols-5">
			{#each TABS as [href, label, Icon] (href)}
				<a
					{href}
					class={[
						"flex flex-col items-center justify-center gap-1 text-[.625rem] font-medium transition-colors active:opacity-50",
						current(href) ? "text-spark" : "text-dim",
					]}
					aria-current={current(href) ? "page" : undefined}
				>
					<Icon class="size-5.5" strokeWidth={current(href) ? 2.4 : 1.8} aria-hidden="true" />
					{label}
				</a>
			{/each}
			<button
				type="button"
				class={[
					"flex flex-col items-center justify-center gap-1 text-[.625rem] font-medium active:opacity-50",
					inMore ? "text-spark" : "text-dim",
				]}
				aria-haspopup="dialog"
				onclick={() => sheet?.showModal()}
			>
				<Ellipsis class="size-5.5" strokeWidth={inMore ? 2.4 : 1.8} aria-hidden="true" />
				More
			</button>
		</div>
	</nav>
</div>

<dialog
	bind:this={sheet}
	class="admin-sheet"
	aria-label="More"
	onclick={(event) => {
		// a tap on the dimmed backdrop lands on the dialog itself
		if (event.target === sheet) {
			sheet?.close();
		}
	}}
>
	<div class="mx-auto mt-2 mb-3 h-1.25 w-9 rounded-full bg-edge" aria-hidden="true"></div>
	<div class="overflow-hidden rounded-2xl border border-line bg-surface">
		{#each MORE as [href, label, Icon] (href)}
			<a
				{href}
				class="flex h-13 items-center gap-3 border-b border-line px-4 text-[1rem] active:bg-fg/6"
				aria-current={current(href) ? "page" : undefined}
			>
				<Icon class={["size-5", current(href) ? "text-spark" : "text-dim"]} aria-hidden="true" />
				<span class="flex-1">{label}</span>
				<ChevronRight class="size-4 text-dim" aria-hidden="true" />
			</a>
		{/each}
		<a class="flex h-13 items-center gap-3 px-4 text-[1rem] active:bg-fg/6" href={resolve("/")} target="_blank">
			<ExternalLink class="size-5 text-dim" aria-hidden="true" />
			<span class="flex-1">Open the site</span>
		</a>
	</div>
	<button
		type="button"
		class="mt-3 flex h-13 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 text-left text-[1rem] text-hot active:bg-fg/6"
		onclick={signOut}
	>
		<LogOut class="size-5" aria-hidden="true" />
		<span class="min-w-0 flex-1 truncate">Sign out <span class="text-sm text-dim">{data.admin.email}</span></span>
	</button>
	<button
		type="button"
		class="mt-3 h-13 w-full rounded-2xl border border-line bg-surface text-[1rem] font-semibold active:bg-fg/6"
		onclick={() => sheet?.close()}>Cancel</button
	>
</dialog>

<PullToRefresh enabled={atTabRoot} />

<form bind:this={newPost} hidden method="POST" action="{resolve('/admin/posts')}?/create"></form>
<Palette bind:this={palette} {commands} />
<p
	class={[
		"fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-full border border-line bg-surface px-3 py-2 shadow-lg transition duration-200 md:bottom-4 md:rounded-none",
		saved ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0",
	]}
	role="status"
>
	{#if saved}<span class="status status-on">Saved</span>{/if}
</p>
