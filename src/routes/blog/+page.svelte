<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";
	import { PERSON, readable, SITE, WEBSITE } from "$lib/seo";

	let { data } = $props();

	const description =
		"Notes and complaints about self-hosting, homelab software, and every tool that was good until it had a funding round.";
</script>

<Meta
	title="Blog: rants about software that grew a pricing page"
	{description}
	path="/blog"
	trail={[["Blog", "/blog"]]}
	structuredData={[
	{
		"@context": "https://schema.org",
		"@type": "Blog",
		"@id": `${SITE}/blog#blog`,
		name: "orochibraru",
		url: `${SITE}/blog`,
		description,
		inLanguage: "en",
		isPartOf: WEBSITE,
		author: PERSON,
		publisher: PERSON,
		blogPost: data.posts.map((post) => ({
			"@type": "BlogPosting",
			headline: post.title,
			description: post.description,
			datePublished: post.date,
			url: `${SITE}/blog/${post.slug}`,
			author: PERSON,
		})),
	},
]}
/>

<main class="mx-auto max-w-page px-6">
	<div class="pt-15 pb-14">
		<span class="tag"
			>{data.posts.length}
			post{data.posts.length === 1 ? "" : "s"}
			&middot;
			<a class="hover:text-accent" href={resolve("/feed.xml")} data-sveltekit-reload>RSS</a></span
		>
		<h1 class="mt-6.5 text-[clamp(2.6rem,7.5vw,5.6rem)]/[.92] animate-rise stereo font-extrabold tracking-[-.045em]">
			Things that<br>
			<span class="grad"
				>annoyed me.</span
			>
		</h1>
		<p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">
			Write-ups on self-hosting and homelab software: what broke, why it broke, and what I built
			instead, so the next person hitting the same wall skips the weekend I lost.
		</p>
	</div>
	<section class="mb-22.5">
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.posts as post (post.slug)}
				<a class="card" href={resolve("/blog/[slug]", { slug: post.slug })}>
					<span class="label"
						><time datetime={post.date}>{readable(post.date)}</time></span
					>
					<h2 class="mt-2.5 mb-2 pr-10 font-sans text-[1.35rem] font-bold tracking-[-.02em] transition-colors">
						{post.title}
					</h2>
					<p class="text-[.92rem] text-dim">{post.description}</p>
				</a>
			{/each}
		</div>
	</section>
</main>
