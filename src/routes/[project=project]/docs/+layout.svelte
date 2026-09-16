<script lang="ts">
	import { ArrowUpRight } from "@lucide/svelte";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { guideIcon } from "$lib/docs-icons";

	let { data, children } = $props();
	const project = $derived(data.project);
	const current = $derived(page.params.slug);
	const items = $derived([
		{
			slug: "overview",
			title: "Overview",
			href: resolve("/[project=project]/docs", { project: project.key }),
			active: !current,
			Icon: guideIcon("overview"),
		},
		...data.guides.map((guide) => ({
			slug: guide.slug,
			title: guide.title,
			href: resolve("/[project=project]/docs/[slug]", { project: project.key, slug: guide.slug }),
			active: guide.slug === current,
			Icon: guideIcon(guide.slug),
		})),
	]);

	// Scroll the strip rather than calling scrollIntoView, which could also move the page.
	let strip = $state<HTMLElement>();
	$effect(() => {
		void current;
		const link = strip?.querySelector<HTMLElement>("[aria-current=page]");
		if (!strip || !link) return;
		strip.scrollLeft += link.getBoundingClientRect().left - strip.getBoundingClientRect().left - 20;
	});
</script>

{#snippet links()}
	{#each items as item (item.slug)}
		<a
			class={[
				"flex items-center gap-2.5 rounded-md px-2.5 py-1.5 font-medium transition-colors",
				item.active ? "bg-acid/10 text-fg" : "text-fg/80 hover:bg-fg/4 hover:text-fg",
			]}
			aria-current={item.active ? "page" : undefined}
			href={item.href}
			><item.Icon
				class={["size-4 shrink-0", item.active ? "text-acid" : "opacity-75"]}
				aria-hidden="true"
			/>
			{item.title}</a
		>
	{/each}
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
</aside>

<!-- below lg the sidebar folds into a scrolling strip above the page -->
<nav
	bind:this={strip}
	class="mx-6 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1.5 font-sans text-sm whitespace-nowrap lg:hidden"
>
	{@render links()}
</nav>

{@render children()}
