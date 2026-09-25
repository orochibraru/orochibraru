<script lang="ts">
	import { resolve } from "$app/paths";
	import BrandIcon from "$lib/components/BrandIcon.svelte";
	import LucideIcon from "$lib/components/LucideIcon.svelte";
	import Meta from "$lib/components/Meta.svelte";
	import { copyButtons } from "$lib/copy";
	import { lightbox } from "$lib/lightbox";
	import { mermaidDiagrams } from "$lib/mermaid";

	let { data } = $props();
</script>

<Meta
	title={data.title}
	description={data.description}
	path="/{data.repo}"
	image={data.image}
	trail={[[data.name, `/${data.repo}`]]}
	structuredData={data.structuredData}
/>

<main class="mx-auto max-w-page px-6">
	<article class="prose project" {@attach copyButtons} {@attach mermaidDiagrams} {@attach lightbox}>
		<div class="pt-10 pb-5">
			<a
				class="text-sm font-medium text-dim hover:text-accent"
				href={resolve("/projects")}
				>&larr; All projects</a
			>
			<span class="tag ml-3.5">{data.tag}</span>
			<h1 class="mt-4.5 text-[clamp(2.4rem,6.5vw,4rem)]/none animate-rise stereo font-extrabold tracking-[-.045em]">
				{data.name}
			</h1>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">{@html data.lede}</p>
			<div class="mt-6.5 flex flex-wrap gap-2.5">
				{#each data.buttons as button (button.href)}
					<a
						class={["btn", button.primary && "btn-primary"]}
						href={button.href}
						target={button.external ? "_blank" : undefined}
						rel={button.external ? "noopener" : undefined}
					>
						{#if button.brand}
							<BrandIcon name={button.brand} />
						{:else if button.node}
							<LucideIcon node={button.node} width={15} height={15} />
						{/if}
						{button.label}
					</a>
				{/each}
			</div>
		</div>
		{@html data.html}
	</article>
</main>
