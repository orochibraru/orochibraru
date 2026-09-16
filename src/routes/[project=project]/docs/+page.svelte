<script lang="ts">
import { resolve } from "$app/paths";
import Meta from "$lib/components/Meta.svelte";
import { clip, PERSON, SITE, WEBSITE } from "$lib/seo";

let { data } = $props();
const project = $derived(data.project);
const path = $derived(`/${project.key}/docs`);
const description = $derived(`Every guide for ${project.name}: ${project.blurb}`);
</script>

<Meta
	title="{project.name} documentation"
	{description}
	{path}
	trail={[
	[project.name, `/${project.key}`],
	["Docs", path],
]}
	structuredData={[
	{
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		"@id": `${SITE}${path}#docs`,
		name: `${project.name} documentation`,
		url: `${SITE}${path}`,
		description,
		inLanguage: "en",
		isPartOf: WEBSITE,
		author: PERSON,
		publisher: PERSON,
		about: { "@type": "SoftwareApplication", name: project.name, url: `${SITE}/${project.key}` },
		hasPart: data.guides.map((guide) => ({
			"@type": "TechArticle",
			headline: guide.title,
			description: clip(guide.intro, 180),
			url: `${SITE}${guide.url}`,
			author: PERSON,
		})),
	},
]}
/>

<main class="mx-auto max-w-[110rem] px-6">
	<div class="pt-10 pb-14">
		<a
			class="text-xs tracking-widest text-dim uppercase hover:text-acid"
			href={resolve(`/${project.key}`)}
			>&larr; {project.name}</a
		>
		<h1 class="mt-4.5 text-[clamp(2.2rem,6vw,3.6rem)]/[1.02] font-extrabold tracking-[-.04em]">
			{project.name}
			docs
		</h1>
		<p class="mt-6 max-w-[72ch] text-[1.05rem] text-dim">{project.blurb}</p>
		<p class="mt-4 max-w-[72ch] text-dim">
			{data.guides.length}
			guides, kept in step with
			<a
				class="border-b border-edge text-cyan hover:border-cyan"
				href="{project.repo}/tree/{project.branch}/docs"
				rel="noopener"
				>the Markdown in the repo</a
			>, which stays the source of truth.
		</p>
	</div>
	<section class="mb-22.5">
		<div class="grid gap-px border border-line bg-line sm:grid-cols-2">
			{#each data.guides as guide (guide.slug)}
				<a
					class="card"
					href={resolve("/[project=project]/docs/[slug]", { project: project.key, slug: guide.slug })}
				>
					<h2 class="mb-2 text-[1.2rem] font-bold tracking-[-.02em] transition-colors">
						{guide.title}
					</h2>
					<p class="text-[.92rem] text-dim">{clip(guide.intro, 150)}</p>
				</a>
			{/each}
			{#if data.guides.length % 2}
				<div class="hidden bg-surface sm:block"></div>
			{/if}
		</div>
	</section>
</main>
