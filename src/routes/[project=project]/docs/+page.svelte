<script lang="ts">
	import { ArrowRight, ArrowUpRight } from "@lucide/svelte";
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";
	import { guideIcon } from "$lib/docs-icons";
	import { clip, PERSON, SITE, WEBSITE } from "$lib/seo";

	let { data } = $props();
	const project = $derived(data.project);
	const path = $derived(`/${project.key}/docs`);
	const description = $derived(`Every guide for ${project.name}: ${project.blurb}`);
	// cards cycle through the three brand accents; full class strings so Tailwind sees them
	const TINTS = [
		{ icon: "bg-acid/10 text-acid ring-acid/20", card: "hover:border-acid/50" },
		{ icon: "bg-cyan/10 text-cyan ring-cyan/20", card: "hover:border-cyan/50" },
		{ icon: "bg-plasma/10 text-plasma ring-plasma/20", card: "hover:border-plasma/50" },
	] as const;
	const start = $derived(
		data.guides.find((guide) => guide.slug === "getting-started") ?? data.guides[0],
	);
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

<main class="px-6 lg:px-10">
	<div class="mx-auto max-w-6xl pt-12 pb-24">
		<header class="max-w-3xl">
			<p
				class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-sans text-xs text-dim"
			>
				<span class="size-1.5 rounded-full bg-neon shadow-[0_0_8px_var(--color-neon)]"></span>
				{data.guides.length} guides &middot; synced daily from GitHub
			</p>
			<h1 class="mt-5 text-[clamp(2.2rem,5vw,3.25rem)]/[1.05] font-bold tracking-tight">
				{project.name}
				<span class="bg-linear-to-r from-acid via-cyan to-plasma bg-clip-text text-transparent"
					>docs</span
				>
			</h1>
			<p class="mt-4 font-sans text-lg/relaxed text-fg/70">{project.blurb}</p>
			<div class="mt-7 flex flex-wrap gap-3 font-sans text-sm font-medium">
				{#if start}
					<a
						class="group inline-flex items-center gap-2 rounded-lg bg-neon px-4 py-2.5 font-semibold text-onneon shadow-[0_8px_24px_-10px_var(--color-neon)] transition hover:brightness-105"
						href={resolve("/[project=project]/docs/[slug]", { project: project.key, slug: start.slug })}
						>Get started<ArrowRight
							class="size-4 transition group-hover:translate-x-0.5"
							aria-hidden="true"
						/></a
					>
				{/if}
				<a
					class="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 transition hover:border-edge"
					href="{project.repo}/tree/{project.branch}/docs"
					rel="noopener">Markdown source<ArrowUpRight class="size-4 text-dim" aria-hidden="true" /></a
				>
			</div>
		</header>

		<section class="mt-14 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Guides">
			{#each data.guides as guide, index (guide.slug)}
				{@const Icon = guideIcon(guide.slug)}
				{@const tint = TINTS[index % TINTS.length] ?? TINTS[0]}
				<a
					class="group relative flex flex-col rounded-xl border border-line bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)] {tint.card}"
					href={resolve("/[project=project]/docs/[slug]", { project: project.key, slug: guide.slug })}
				>
					<span
						class="grid size-9 place-items-center rounded-lg ring-1 transition group-hover:scale-105 {tint.icon}"
						><Icon class="size-4.5" aria-hidden="true" /></span
					>
					<ArrowUpRight
						class="absolute top-5 right-5 size-4 text-dim opacity-0 transition group-hover:opacity-100"
						aria-hidden="true"
					/>
					<h2 class="mt-4 text-base font-bold tracking-[-.02em]">{guide.title}</h2>
					<p class="mt-1.5 line-clamp-2 font-sans text-sm/6 text-dim">{guide.intro}</p>
				</a>
			{/each}
		</section>
	</div>
</main>
