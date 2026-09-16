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

	// Copy buttons are rendered with the guide, so one listener serves every block on it.
	function copyButtons(node: HTMLElement) {
		const onclick = async (event: MouseEvent) => {
			const button = (event.target as Element).closest<HTMLButtonElement>(".copy");
			const code = button?.parentElement?.querySelector("pre")?.textContent;
			if (!button || !code) {
				return;
			}
			await navigator.clipboard.writeText(code);
			button.textContent = "Copied";
			setTimeout(() => {
				button.textContent = "Copy";
			}, 1500);
		};
		node.addEventListener("click", onclick);
		return () => node.removeEventListener("click", onclick);
	}
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

<svelte:window onscroll={spy} onresize={spy} />

<main class="px-6 lg:px-10">
	<!-- the article centres in what is left of the viewport; the contents rail pins to its right edge -->
	<div class="grid gap-x-12 gap-y-9 pt-12 pb-22.5 xl:grid-cols-[minmax(0,1fr)_15rem]">
		<article class="docs mx-auto w-full max-w-6xl min-w-0">
			<h1 class="mb-7 text-[clamp(2rem,5vw,3rem)]/[1.05] font-extrabold tracking-tight">
				{data.title}
			</h1>
			<div class="md" {@attach copyButtons}>{@html data.html}</div>
			<div class="mt-14 grid gap-3 sm:grid-cols-2">
				{#each steps as step (step.label)}
					{#if step.guide}
						<a
							class={[
								"group rounded-xl border border-line bg-surface px-5 py-4 transition hover:border-edge",
								step.label.startsWith("Next") && "sm:col-start-2 sm:text-right",
							]}
							href={resolve("/[project=project]/docs/[slug]", { project: project.key, slug: step.guide.slug })}
							><span class="font-sans text-xs text-dim">{step.label}</span>
							<h2 class="mt-1 font-bold tracking-[-.02em] transition-colors group-hover:text-acid">
								{step.guide.title}
							</h2></a
						>
					{/if}
				{/each}
			</div>
			<p class="mt-7 text-[12.5px] text-dim">
				This guide lives in the project repo:
				<a
					class="border-b border-edge hover:border-cyan"
					href="{project.repo}/blob/{project.branch}/docs/{data.slug}.md"
					target="_blank"
					rel="noopener"
					>edit it there</a
				>, and this page follows within a day.
			</p>
		</article>
		{#if data.contents.length >= 2}
			<nav
				class="hidden text-[.85rem]/[1.5] text-fg/75 xl:sticky xl:top-9 xl:block xl:max-h-[calc(100vh-4.5rem)] xl:self-start xl:overflow-y-auto"
			>
				<p class="mb-3.5 text-[11px] tracking-[.18em] text-plasma uppercase">On this page</p>
				<ul class="font-sans text-[.9rem]">
					{#each data.contents as section (section.id)}
						<li
							class="border-l py-1.25 {section.level === 3 ? "pl-7.5" : "pl-4"} {section.id === active ? "border-acid text-acid" : "border-line"}"
						>
							<a
								class="block hover:text-acid"
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
