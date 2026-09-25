<script lang="ts">
	import { Menu } from "@lucide/svelte";
	import { onMount } from "svelte";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import Drawer from "./Drawer.svelte";
	import Logo from "./Logo.svelte";

	let {
		width,
		source,
		docs = false,
		onsearch,
	}: { width: string; source?: string; docs?: boolean; onsearch: () => void } = $props();

	const MODES = ["system", "light", "dark"] as const;
	type Mode = (typeof MODES)[number];

	let menu = $state<Drawer>();
	let mode = $state<Mode>("system");
	const next = $derived(MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? "system");

	onMount(() => {
		const stored = document.documentElement.dataset.theme;
		if (stored === "light" || stored === "dark") {
			mode = stored;
		}
	});

	// System stores nothing, so the stylesheet's prefers-color-scheme rules keep following the OS.
	function cycleTheme() {
		mode = next;
		const root = document.documentElement;
		if (mode === "system") {
			delete root.dataset.theme;
		} else {
			root.dataset.theme = mode;
		}
		try {
			if (mode === "system") {
				localStorage.removeItem("theme");
			} else {
				localStorage.setItem("theme", mode);
			}
		} catch {}
	}
</script>

{#snippet links(style: string)}
	<a class={style} href={resolve("/projects")}>Projects</a>
	<a class={style} href={resolve("/blog")}>Blog</a>
	<a class={style} href={resolve("/about")}>About</a>
	<a class={style} href={source ?? "https://github.com/orochibraru?tab=repositories"} target="_blank" rel="noopener"
		>{source ? "Source" : "GitHub"}</a
	>
	{#if page.data.signedIn}
		<a class={style} href={resolve("/admin")}>Admin</a>
	{/if}
{/snippet}

<!-- off the docs it floats: a glass pill pinned to the top while the page scrolls under it -->
<header
	class={[
		"z-40 mx-auto px-6",
		width,
		docs ? "lg:border-b lg:border-line" : "sticky top-3 mt-3 mb-4",
	]}
>
	<nav
		class={[
			"flex flex-wrap items-center justify-between gap-4",
			docs ? "py-7 lg:h-22 lg:py-0" : "glass rounded-full py-2 pr-2 pl-5 backdrop-blur-xl",
		]}
	>
		<!-- docs pages carry the logo in their sidebar from lg up -->
		<a
			class="group flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-[-.02em] {docs ? "lg:hidden" : ""}"
			href={resolve("/")}
			><Logo class="size-7 transition-transform duration-700 ease-out-expo group-hover:-rotate-360" /><span
				>orochi<span class="text-accent">braru</span></span
			></a
		>
		<div class="ml-auto flex items-center gap-3 text-[15px] font-medium whitespace-nowrap text-fg/80 md:gap-6">
			<!-- below md the links move into the menu drawer -->
			<div class="hidden items-center gap-6 md:flex">
				{@render links("relative transition-colors hover:text-accent after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-300 hover:after:scale-x-100")}
			</div>
			<button
				type="button"
				aria-label="Search the site"
				class="flex h-9 items-center gap-2 rounded-full border border-edge px-3.5 transition hover:border-accent hover:text-accent"
				onclick={onsearch}
			>
				<svg
					viewBox="0 0 24 24"
					class="size-4"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.5-3.5" />
				</svg>
				<span class="hidden md:inline">Search</span>
				<kbd class="kbd hidden md:inline-grid">&#8984;K</kbd>
			</button>
			<button
				type="button"
				aria-label="Theme: {mode}. Switch to {next}."
				title="Theme: {mode}"
				class="grid size-9 place-items-center rounded-full border border-edge transition duration-500 hover:rotate-45 hover:border-accent hover:text-accent"
				onclick={cycleTheme}
			>
				<svg
					viewBox="0 0 24 24"
					class="theme-icon theme-system size-4"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
				>
					<rect x="3" y="4" width="18" height="12.5" rx="1.5" />
					<path d="M9.5 20.5h5M12 16.5v4" />
				</svg>
				<svg
					viewBox="0 0 24 24"
					class="theme-icon theme-light size-4"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
				>
					<circle cx="12" cy="12" r="4.2" />
					<path
						d="M12 2.7v2.1M12 19.2v2.1M21.3 12h-2.1M4.8 12H2.7M18.6 5.4 17.1 6.9M6.9 17.1 5.4 18.6M18.6 18.6 17.1 17.1M6.9 6.9 5.4 5.4"
					/>
				</svg>
				<svg
					viewBox="0 0 24 24"
					class="theme-icon theme-dark size-4"
					aria-hidden="true"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linejoin="round"
				>
					<path d="M20.2 14.8A8.6 8.6 0 0 1 9.2 3.8a8.6 8.6 0 1 0 11 11Z" />
				</svg>
			</button>
			<button
				type="button"
				aria-label="Open the site menu"
				class="grid size-9 place-items-center rounded-full border border-edge transition hover:border-accent hover:text-accent md:hidden"
				onclick={() => menu?.open()}
			>
				<Menu class="size-4" aria-hidden="true" />
			</button>
		</div>
	</nav>
</header>

<Drawer bind:this={menu} label="Menu" side="right">
	<nav class="flex flex-col p-3 text-base font-medium">
		{@render links("rounded-2xl px-3 py-3 text-fg/80 transition-colors hover:bg-fg/4 hover:text-accent")}
	</nav>
</Drawer>
