<script lang="ts">
	import { onMount } from "svelte";
	import { resolve } from "$app/paths";

	let {
		width,
		source,
		docs = false,
		onsearch,
	}: { width: string; source?: string; docs?: boolean; onsearch: () => void } = $props();

	const MODES = ["system", "light", "dark"] as const;
	type Mode = (typeof MODES)[number];

	let mode = $state<Mode>("system");
	const next = $derived(MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? "system");

	onMount(() => {
		const stored = document.documentElement.dataset.theme;
		if (stored === "light" || stored === "dark") mode = stored;
	});

	// System stores nothing, so the stylesheet's prefers-color-scheme rules keep following the OS.
	function cycleTheme() {
		mode = next;
		const root = document.documentElement;
		if (mode === "system") delete root.dataset.theme;
		else root.dataset.theme = mode;
		try {
			if (mode === "system") localStorage.removeItem("theme");
			else localStorage.setItem("theme", mode);
		} catch {}
	}
</script>

<header class="mx-auto {width} px-6 {docs ? "lg:border-b lg:border-line" : ""}">
	<nav
		class="flex flex-wrap items-center justify-between gap-4 py-7 {docs ? "lg:h-22 lg:py-0" : ""}"
	>
		<!-- docs pages carry the logo in their sidebar from lg up -->
		<a class="font-mono text-[17px] font-bold tracking-[-.02em] {docs ? "lg:hidden" : ""}" href={resolve("/")}
			>orochi<span class="text-acid">braru</span></a
		>
		<div class="ml-auto flex items-center gap-4 text-[15px] font-medium whitespace-nowrap text-fg/80 sm:gap-6">
			<a class="hover:text-acid" href={resolve("/#projects")}>Projects</a>
			<a class="hover:text-acid" href={resolve("/blog")}>Blog</a>
			<a class="hover:text-acid" href={resolve("/about")}>About</a>
			<a
				class="hover:text-acid"
				href={source ?? "https://github.com/orochibraru?tab=repositories"}
				rel="noopener"
				>{source ? "Source" : "GitHub"}</a
			>
			<button
				type="button"
				aria-label="Search the site"
				class="flex h-9 items-center gap-2 border border-edge px-3 transition hover:border-acid hover:text-acid"
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
				<span class="hidden sm:inline">Search</span>
				<kbd class="hidden font-mono text-xs font-normal text-dim sm:inline">&#8984;K</kbd>
			</button>
			<button
				type="button"
				aria-label="Theme: {mode}. Switch to {next}."
				title="Theme: {mode}"
				class="grid size-9 place-items-center border border-edge transition hover:border-acid hover:text-acid"
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
		</div>
	</nav>
</header>
