<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";
	import { SITE, WEBSITE } from "$lib/seo";

	let { data } = $props();

	// projects with a screenshot get the big treatment; the rest share a grid
	const flagships = $derived(data.projects.filter((project) => project.shot));
	const others = $derived(data.projects.filter((project) => !project.shot));

	const description =
		"Free, open-source, self-hosted replacements for the subscriptions a homelab collects: a drive, a PaaS, server alerting, a start page, a media client and the tooling that ships them.";
</script>

<Meta
	title="Projects: free, self-hosted software for your homelab"
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
		<span class="tag">{data.projects.length} projects &middot; MIT &amp; AGPL</span>
		<h1 class="mt-6.5 text-[clamp(2.6rem,7.5vw,5.6rem)]/[.92] animate-rise stereo font-extrabold tracking-[-.045em]">
			Each one replaces<br>
			<span class="grad">a subscription.</span>
		</h1>
		<p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">
			Every project here does a job people usually rent from someone else. Each one runs in a
			container on a box you own, keeps its data in a volume you can back up, and costs nothing,
			today or later.
		</p>
	</div>

	<section class="zone zone-split mb-24">
		<div class="flex flex-col gap-6">
			{#each flagships as project, index (project.repo)}
				<!-- odd ones swap sides -->
				<article
					class={[
						"glass group grid items-center gap-8 overflow-hidden rounded-4xl p-7 sm:p-10 lg:grid-cols-[2fr_3fr]",
						// each side is a channel: left slides glow crimson, right ones gold
						index % 2 ? "[--ch:var(--color-cool)]" : "[--ch:var(--color-hot)]",
					]}
				>
					<div class={["drift", index % 2 && "lg:order-2"]}>
						<span class="label">{project.category}</span>
						<h2 class="mt-2 text-[clamp(1.8rem,3.5vw,2.6rem)]/none font-extrabold tracking-[-.04em]">
							{project.name}
						</h2>
						<p class="mt-4 mb-5 text-dim">{project.blurb}</p>
						{@render chips(project.chips)}
						<div class="mt-7 flex flex-wrap gap-2.5">
							<a class="btn btn-primary" href={resolve("/[repo]", { repo: project.repo })}
								>Open {project.name}</a
							>
							{#if project.guides}
								<a class="btn" href={resolve("/[repo]/docs", { repo: project.repo })}
									>{project.guides} guides</a
								>
							{/if}
						</div>
					</div>
					{#if project.shot}
						<a
							class="tilt block max-h-112 overflow-hidden rounded-2xl border border-line shadow-[0_30px_90px_-30px_var(--ch)]"
							href={resolve("/[repo]", { repo: project.repo })}
							tabindex="-1"
						>
							<img
								class="on-light block w-full"
								src={project.shot.light}
								width={project.shot.width}
								height={project.shot.height}
								alt={project.shot.alt}
								loading="lazy"
								decoding="async"
							>
							<img
								class="on-dark block w-full"
								src={project.shot.dark}
								width={project.shot.width}
								height={project.shot.height}
								alt={project.shot.alt}
								loading="lazy"
								decoding="async"
							>
						</a>
					{/if}
				</article>
			{/each}
		</div>

		{#if others.length}
			<h2 class="mt-16 mb-6 text-xl font-bold tracking-[-.02em]">Also in the box</h2>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each others as project (project.repo)}
					<a class="card" href={resolve("/[repo]", { repo: project.repo })}>
						<span class="label">{project.category}</span>
						<h3 class="mt-2.5 mb-2 pr-10 text-[1.35rem] font-bold tracking-[-.02em]">
							{project.name}
						</h3>
						<p class="mb-4.5 text-[.92rem] text-dim">{project.blurb}</p>
						{@render chips(project.chips)}
					</a>
				{/each}
			</div>
		{/if}
	</section>
</main>
