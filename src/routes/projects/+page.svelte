<script lang="ts">
	import { resolve } from "$app/paths";
	import BrandIcon from "$lib/components/BrandIcon.svelte";
	import Meta from "$lib/components/Meta.svelte";
	import { SITE, WEBSITE } from "$lib/seo";

	let { data } = $props();

	// projects with a screenshot get a card in the deck; the rest share a grid
	const flagships = $derived(data.projects.filter((project) => project.shot));
	const others = $derived(data.projects.filter((project) => !project.shot));
	const description = $derived(data.copy.description);

	const guidesLabel = (count: number) => `${count} guide${count === 1 ? "" : "s"}`;
</script>

<Meta
	title={data.copy.title}
	{description}
	path="/projects"
	trail={[["Projects", "/projects"]]}
	structuredData={[
	{
		"@context": "https://schema.org",
		"@type": "CollectionPage",
		name: "Projects",
		url: `${SITE}/projects`,
		description,
		inLanguage: "en",
		isPartOf: WEBSITE,
		hasPart: data.projects.map((project) => ({
			"@type": "SoftwareApplication",
			name: project.name,
			applicationCategory: project.category,
			description: project.blurb,
			url: `${SITE}/${project.repo}`,
		})),
	},
]}
/>

{#snippet chips(list: string[])}
	<div class="flex flex-wrap gap-1.5">
		{#each list as chip (chip)}
			<span class="chip">{chip}</span>{" "}
		{/each}
	</div>
{/snippet}

<main class="mx-auto max-w-page px-6">
	<div class="pt-15 pb-14">
		<span class="tag">{data.projects.length} projects{data.copy.tag ? ` · ${data.copy.tag}` : ""}</span>
		<h1 class="mt-6.5 text-[clamp(2.6rem,7.5vw,5.6rem)]/[.92] animate-rise stereo font-extrabold tracking-[-.045em]">
			{data.copy.heading}{#if data.copy.accent}<br>
				<span class="grad">{data.copy.accent}</span>{/if}
		</h1>
		{#if data.copy.intro}
			<p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">{data.copy.intro}</p>
		{/if}
	</div>

	<section class="zone zone-split mb-24">
		<div class="deck" style:--count={flagships.length}>
			{#each flagships as project, index (project.repo)}
				<article class="deck-card mb-6 lg:mb-[14svh] lg:last:mb-0" style:--index={index}>
					<!-- the two channels take turns: crimson glows, then gold -->
					<div
						class="deck-face grid lg:min-h-128 lg:grid-cols-[5fr_7fr]"
						style:--glow={index % 2 ? "var(--glow-2)" : "var(--glow-1)"}
					>
						<div class="self-center p-8 sm:p-10 lg:py-12 lg:pr-4 lg:pl-12">
							<span class="label">{project.category}</span>
							<h2 class="mt-2 text-[clamp(2.2rem,4.5vw,3.6rem)]/none font-extrabold tracking-[-.045em]">
								{project.name}
							</h2>
							<p class="mt-5 mb-6 max-w-[52ch] text-[1.05rem] text-dim">{project.blurb}</p>
							{@render chips(project.chips)}
							<div class="mt-8 flex flex-wrap gap-2.5">
								<a class="btn btn-primary" href={resolve("/[repo]", { repo: project.repo })}
									>Details<span class="sr-only"> about {project.name}</span></a
								>
								{#if project.guides}
									<a class="btn" href={resolve("/[repo]/[[channel=channel]]/docs", { repo: project.repo })}
										>{guidesLabel(project.guides)}</a
									>
								{/if}
								{#if project.source}
									<a class="btn px-4" href={project.source} target="_blank" rel="noopener" aria-label="{project.name} on GitHub"
										><BrandIcon name="github" /></a
									>
								{/if}
							</div>
						</div>
						{#if project.shot}
							<!-- bleeds off the card's bottom-right corner, cropped by its edge -->
							<a
								class="tilt ml-8 block max-h-[min(30rem,55svh)] self-end overflow-hidden rounded-tl-2xl border-t border-l border-edge shadow-[-20px_-20px_60px_-30px_rgb(0_0_0/.35)] sm:ml-10 lg:mt-12 lg:ml-0"
								href={resolve("/[repo]", { repo: project.repo })}
								tabindex="-1"
							>
								<img
									class="on-light block w-full"
									src={project.shot.light}
									width={project.shot.width}
									height={project.shot.height}
									alt={project.shot.alt}
									loading={index ? "lazy" : "eager"}
									decoding="async"
								>
								<img
									class="on-dark block w-full"
									src={project.shot.dark}
									width={project.shot.width}
									height={project.shot.height}
									alt={project.shot.alt}
									loading={index ? "lazy" : "eager"}
									decoding="async"
								>
							</a>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		{#if others.length}
			<h2 class="mt-24 mb-6 text-[clamp(1.6rem,3vw,2.2rem)] font-bold tracking-[-.03em]">{data.copy.others}</h2>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each others as project (project.repo)}
					<a class="card flex flex-col" href={resolve("/[repo]", { repo: project.repo })}>
						<span class="label">{project.category}</span>
						<h3 class="mt-2.5 mb-2 pr-10 text-[1.35rem] font-bold tracking-[-.02em]">
							{project.name}
						</h3>
						<p class="mb-5 text-[.92rem] text-dim">{project.blurb}</p>
						<div class="mt-auto">{@render chips(project.chips)}</div>
						{#if project.guides}
							<p class="mt-4 text-[13px] text-dim">{guidesLabel(project.guides)}</p>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</section>
</main>
