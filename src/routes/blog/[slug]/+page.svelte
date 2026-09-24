<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";
	import { copyButtons } from "$lib/copy";
	import { lightbox } from "$lib/lightbox";
	import { mermaidDiagrams } from "$lib/mermaid";
	import { PERSON, readable, SITE } from "$lib/seo";

	let { data } = $props();
	const post = $derived(data.post);
	const path = $derived(`/blog/${post.slug}`);
</script>

<svelte:head>
	<meta property="article:published_time" content={post.date}>
</svelte:head>

<Meta
	title="{post.title} | orochibraru"
	description={post.description}
	{path}
	ogType="article"
	trail={[
	["Blog", "/blog"],
	[post.title, path],
]}
	structuredData={[
	{
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		description: post.description,
		datePublished: post.date,
		dateModified: post.date,
		url: `${SITE}${path}`,
		mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}${path}` },
		isPartOf: { "@id": `${SITE}/blog#blog` },
		inLanguage: "en",
		author: PERSON,
		publisher: PERSON,
	},
]}
/>

<main class="mx-auto max-w-page px-6">
	<article>
		<div class="pt-10 pb-8">
			<a class="text-sm font-medium text-dim hover:text-accent" href={resolve("/blog")}
				>&larr; All posts</a
			>
			<h1
				class="mt-4.5 max-w-[24ch] text-[clamp(2.2rem,5vw,3.2rem)]/[1.05] animate-rise stereo font-extrabold tracking-[-.035em]"
			>
				{post.title}
			</h1>
			<p class="mt-5 text-sm font-medium text-dim">
				<time datetime={post.date}>{readable(post.date)}</time>
			</p>
		</div>
		<div class="md pb-22.5" {@attach copyButtons} {@attach mermaidDiagrams} {@attach lightbox}>{@html post.html}</div>
	</article>
</main>
