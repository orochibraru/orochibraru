<script lang="ts">
	import { ArrowUpRight, Menu } from "@lucide/svelte";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import Drawer from "$lib/components/Drawer.svelte";
	import LucideIcon from "$lib/components/LucideIcon.svelte";

	let { data, children } = $props();
	const project = $derived(data.project);
	const current = $derived(page.params.slug);
	const overview = $derived({
		slug: "overview",
		title: "Overview",
		href: resolve("/[repo]/docs", { repo: project.key }),
		active: !current,
		icon: data.overviewIcon,
	});
	const sections = $derived(
		data.categories.map((category) => ({
			title: category.title,
			items: data.guides
				.filter((guide) => category.slugs.includes(guide.slug))
				.map((guide) => ({
					slug: guide.slug,
					title: guide.label,
					href: resolve("/[repo]/docs/[slug]", {
						repo: project.key,
						slug: guide.slug,
					}),
					active: guide.slug === current,
					icon: guide.icon,
				})),
		})),
	);

	const here = $derived(
		sections.flatMap((section) => section.items).find((item) => item.active)?.title ?? "Overview",
	);

	let menu = $state<Drawer>();
</script>

{#snippet link(item: typeof overview)}
	<a
		class={[
			"flex items-center gap-2.5 rounded-md px-2.5 py-1.5 font-medium transition-colors",
			item.active ? "bg-acid/10 text-fg" : "text-fg/80 hover:bg-fg/4 hover:text-fg",
		]}
		aria-current={item.active ? "page" : undefined}
		href={item.href}
		><LucideIcon
			node={item.icon}
			class={["size-4 shrink-0", item.active ? "text-acid" : "opacity-75"]}
			aria-hidden="true"
		/>
		{item.title}</a
	>
{/snippet}

{#snippet links()}
	{@render link(overview)}
	{#each sections as section, index (index)}
		{#if section.title}
			<h2 class="mt-5 mb-1 px-2.5 text-[10px] tracking-[.18em] text-dim uppercase">
				{section.title}
			</h2>
		{/if}
		{#each section.items as item (item.slug)}
			{@render link(item)}
		{/each}
	{/each}
{/snippet}

{#snippet navigation()}
	<div class="px-3.5 pt-5 pb-2">
		<a
			class="group flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2.5 transition hover:border-edge"
			href={resolve(`/${project.key}`)}
		>
			<span>
				<span class="block text-[10px] tracking-[.18em] text-plasma uppercase">Documentation</span>
				<span class="mt-0.5 block font-bold tracking-[-.02em]">{project.name}</span>
			</span>
			<ArrowUpRight
				class="size-4 text-dim transition group-hover:text-acid"
				aria-label="Project page"
			/>
		</a>
	</div>
	<nav class="flex flex-col gap-0.5 px-3.5 pt-2 pb-6 font-sans text-sm">
		{@render links()}
	</nav>
	<!-- pinned to the bottom of the column, and stays in view when the guide list scrolls -->
	<a
		class="group sticky bottom-0 mt-auto flex items-center gap-2.5 border-t border-line bg-surface px-6 py-4 font-sans text-sm font-medium text-fg/80 transition-colors hover:text-fg"
		href={project.repo}
		target="_blank"
		rel="noopener"
	>
		<svg viewBox="0 0 24 24" class="size-4 shrink-0" fill="currentColor" aria-hidden="true">
			<path
				d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
			/>
		</svg>
		{project.name} on GitHub
		<ArrowUpRight
			class="ml-auto size-4 text-dim transition group-hover:text-acid"
			aria-hidden="true"
		/>
	</a>
{/snippet}

<aside
	class="fixed inset-y-0 left-0 hidden w-72 flex-col overflow-y-auto border-r border-line bg-surface lg:flex"
>
	<!-- same height as the docs header, so the two bottom borders meet -->
	<a
		class="flex h-22 shrink-0 items-center border-b border-line px-6 font-mono text-[17px] font-bold tracking-[-.02em]"
		href={resolve("/")}
		>orochi<span class="text-acid">braru</span></a
	>
	{@render navigation()}
</aside>

<!-- below lg the sidebar becomes a drawer, opened from a bar saying where you are -->
<div class="px-6 lg:hidden">
	<button
		type="button"
		class="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left font-sans text-sm transition hover:border-edge"
		aria-label="Open the {project.name} docs menu"
		onclick={() => menu?.open()}
	>
		<Menu class="size-4 shrink-0 text-dim" aria-hidden="true" />
		<span class="shrink-0 text-dim">{project.name} docs</span>
		<span class="text-edge" aria-hidden="true">/</span>
		<span class="truncate font-medium">{here}</span>
	</button>
</div>

<Drawer bind:this={menu} label="{project.name} docs" side="left">
	{@render navigation()}
</Drawer>

{@render children()}
