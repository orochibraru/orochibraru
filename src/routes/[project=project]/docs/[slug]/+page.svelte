<script lang="ts">
import { resolve } from "$app/paths";
import Meta from "$lib/components/Meta.svelte";
import { clip, PERSON, SITE } from "$lib/seo";

let { data } = $props();
const project = $derived(data.project);
const guide = $derived(data.guides.find((guide) => guide.slug === data.slug));
const position = $derived(data.guides.findIndex((guide) => guide.slug === data.slug));
const steps = $derived([
	{ guide: data.guides[position - 1], label: "← Previous" },
	{ guide: data.guides[position + 1], label: "Next →" },
]);
const path = $derived(`/${project.key}/docs/${data.slug}`);
const description = $derived(clip(guide?.intro ?? "", 180) || `${project.name} documentation.`);
</script>

<Meta
	title="{data.title} | {project.name} docs"
	{description}
	{path}
	ogType="article"
	trail={[
	[project.name, `/${project.key}`],
	["Docs", `/${project.key}/docs`],
	[data.title, path],
]}
	structuredData={[
	{
		"@context": "https://schema.org",
		"@type": "TechArticle",
		headline: data.title,
		description: clip(guide?.intro ?? "", 180),
		url: `${SITE}${path}`,
		mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${path}` },
		isPartOf: { "@id": `${SITE}/${project.key}/docs#docs` },
		about: { "@type": "SoftwareApplication", name: project.name, url: `${SITE}/${project.key}` },
		inLanguage: "en",
		author: PERSON,
		publisher: PERSON,
	},
]}
/>

<main class="mx-auto max-w-[110rem] px-6">
	<div
		class="grid gap-x-12 gap-y-9 pt-10 pb-22.5 lg:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_14rem]"
	>
		<aside class="min-w-0 lg:sticky lg:top-9 lg:self-start">
			<a
				class="text-xs tracking-widest text-dim uppercase hover:text-acid"
				href={resolve(`/${project.key}`)}
				>&larr; {project.name}</a
			>
			<p class="mt-3 mb-4 text-[11px] tracking-[.18em] text-plasma uppercase">Documentation</p>
			<nav
				class="flex gap-4.5 overflow-x-auto pb-3 text-[.92rem] whitespace-nowrap text-dim lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0 lg:whitespace-normal"
			>
				{#each data.guides as sibling (sibling.slug)}
					<a
						class={sibling.slug === data.slug ? "text-acid" : "hover:text-acid"}
						aria-current={sibling.slug === data.slug ? "page" : undefined}
						href={resolve("/[project=project]/docs/[slug]", { project: project.key, slug: sibling.slug })}
						>{sibling.title}</a
					>
				{/each}
			</nav>
		</aside>
		<article class="docs min-w-0">
			<h1 class="mb-7 text-[clamp(2rem,5vw,3rem)]/[1.05] font-extrabold tracking-[-.04em]">
				{data.title}
			</h1>
			<div class="md">{@html data.html}</div>
			<div class="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2">
				{#each steps as step (step.label)}
					{#if step.guide}
						<a
							class="card"
							href={resolve("/[project=project]/docs/[slug]", { project: project.key, slug: step.guide.slug })}
							><span class="text-[11px] tracking-[.18em] text-dim uppercase">{step.label}</span>
							<h2 class="mt-2.5 text-[1.15rem] font-bold tracking-[-.02em] transition-colors">
								{step.guide.title}
							</h2></a
						>
					{:else}
						<div class="hidden bg-surface sm:block"></div>
					{/if}
				{/each}
			</div>
			<p class="mt-7 text-[12.5px] text-dim">
				This guide lives in the project repo:
				<a
					class="border-b border-edge hover:border-cyan"
					href="{project.repo}/blob/{project.branch}/docs/{data.slug}.md"
					rel="noopener"
					>edit it there</a
				>, and this page follows within a day.
			</p>
		</article>
		{#if data.contents.length >= 2}
			<nav
				class="hidden text-[.85rem]/[1.5] text-dim 2xl:sticky 2xl:top-9 2xl:block 2xl:self-start"
			>
				<p class="mb-3.5 text-[11px] tracking-[.18em] text-plasma uppercase">On this page</p>
				<ul class="flex flex-col gap-2.5 border-l border-line pl-4">
					{#each data.contents as section (section.id)}
						<li class={section.level === 3 ? "pl-3.5" : undefined}>
							<a class="hover:text-acid" href="#{section.id}">{section.heading}</a>
						</li>
					{/each}
				</ul>
			</nav>
		{:else}
			<div class="hidden 2xl:block"></div>
		{/if}
	</div>
</main>
