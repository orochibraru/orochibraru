<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import Meta from "$lib/components/Meta.svelte";
	import PageActions from "$lib/components/PageActions.svelte";
	import { anchorLinks, copyButtons } from "$lib/copy";
	import { lightbox } from "$lib/lightbox";
	import { mermaidDiagrams } from "$lib/mermaid";
	import { docsUrl } from "$lib/projects";
	import { clip, PERSON, SITE } from "$lib/seo";

	let { data } = $props();
	const project = $derived(data.project);
	const guide = $derived(data.guides.find((guide) => guide.slug === data.slug));
	const position = $derived(data.guides.findIndex((guide) => guide.slug === data.slug));
	const steps = $derived([
		{ guide: data.guides[position - 1], label: "← Previous" },
		{ guide: data.guides[position + 1], label: "Next →" },
	]);
	const path = $derived(docsUrl(project, data.slug));
	// a repo that cuts releases publishes its Latest one: edits wait for the next
	const released = $derived(data.versions.length > 1 && project.channel === "latest");
	const description = $derived(clip(guide?.intro ?? "", 180) || `${project.name} documentation.`);

	// The section being read is the last heading scrolled past; at the very bottom it is the
	// last one, since short closing sections never reach the top of the viewport.
	let active = $state("");
	function spy() {
		const ids = data.contents.map((section) => section.id);
		let current = ids[0] ?? "";
		for (const id of ids) {
			const top = document.getElementById(id)?.getBoundingClientRect().top;
			if (top === undefined || top > 120) {
				break;
			}
			current = id;
		}
		if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
			current = ids.at(-1) ?? "";
		}
		active = current;
	}
	$effect(spy);
</script>

<Meta
	title="{data.title} | {project.name} docs"
	{description}
	{path}
	noindex={project.channel !== "latest"}
	ogType="article"
	trail={[
	[project.name, `/${project.key}`],
	["Docs", docsUrl(project)],
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
		isPartOf: { "@id": `${SITE}${docsUrl(project)}#docs` },
		about: { "@type": "SoftwareApplication", name: project.name, url: `${SITE}/${project.key}` },
		inLanguage: "en",
		author: PERSON,
		publisher: PERSON,
	},
]}
/>

<svelte:window onscroll={spy} onresize={spy} />

<main class="px-6 lg:px-10">
	<!-- the article centres in what is left of the viewport; the contents rail pins to its right edge -->
	<div class="grid gap-x-12 gap-y-9 pt-12 pb-22.5 xl:grid-cols-[minmax(0,1fr)_15rem]">
		<article class="docs mx-auto w-full max-w-6xl min-w-0">
			<div class="mb-7 flex flex-wrap items-start justify-between gap-4">
				<h1 class="text-[clamp(2rem,5vw,3rem)]/[1.05] stereo font-extrabold tracking-tight">
					{data.title}
				</h1>
				<PageActions {path} />
			</div>
			<div class="md" {@attach copyButtons} {@attach anchorLinks} {@attach mermaidDiagrams} {@attach lightbox}>{@html data.html}</div>
			<div class="mt-14 grid gap-3 sm:grid-cols-2">
				{#each steps as step (step.label)}
					{#if step.guide}
						<a
							class={[
								"group glass rounded-2xl px-5 py-4 transition hover:border-edge",
								step.label.startsWith("Next") && "sm:col-start-2 sm:text-right",
							]}
							href={resolve("/[repo]/[[channel=channel]]/docs/[slug]", {
								repo: project.key,
								channel: page.params.channel,
								slug: step.guide.slug,
							})}
							><span class="font-sans text-xs text-dim">{step.label}</span>
							<h2 class="mt-1 font-bold tracking-[-.02em] transition-colors group-hover:text-accent">
								{step.guide.title}
							</h2></a
						>
					{/if}
				{/each}
			</div>
			<p class="mt-7 text-[12.5px] text-dim">
				This guide lives in the project repo:
				<a
					class="border-b border-edge hover:border-cool"
					href={data.source}
					target="_blank"
					rel="noopener"
					>edit it there</a
				>, and this page follows {released ? "with the next release" : "within a day"}.
			</p>
		</article>
		{#if data.contents.length >= 2}
			<nav
				class="hidden text-[.85rem]/[1.5] text-fg/75 xl:sticky xl:top-9 xl:block xl:max-h-[calc(100vh-4.5rem)] xl:self-start xl:overflow-y-auto"
			>
				<p class="mb-3.5 label">On this page</p>
				<ul class="font-sans text-[.9rem]">
					{#each data.contents as section (section.id)}
						<li
							class="border-l py-1.25 {section.level === 3 ? "pl-7.5" : "pl-4"} {section.id === active ? "border-accent text-accent" : "border-line"}"
						>
							<a
								class="block hover:text-accent"
								aria-current={section.id === active ? "location" : undefined}
								href="#{section.id}"
								>{section.heading}</a
							>
						</li>
					{/each}
				</ul>
			</nav>
		{:else}
			<div class="hidden xl:block"></div>
		{/if}
	</div>
</main>
