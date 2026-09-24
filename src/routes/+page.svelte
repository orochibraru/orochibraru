<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";
	import { readable } from "$lib/seo";

	let { data } = $props();

	// projects with a screenshot get the big treatment; the rest share a grid
	const flagships = $derived(data.projects.filter((project) => project.shot));
	const others = $derived(data.projects.filter((project) => !project.shot));
	const guides = $derived(data.projects.reduce((total, project) => total + project.guides, 0));
	const stats = $derived([
		{ value: data.projects.length, label: "projects, all of them open source" },
		{ value: guides, label: "guides, synced from the repos" },
		{ value: "0 €", label: "what any of it costs, forever" },
		{ value: "0", label: "bytes of telemetry sent home" },
	]);
</script>

<Meta
	title="orochibraru: free, self-hosted software for your homelab"
	description="Free and open-source homelab software: self-hosted drive, a Cloud Run alternative, server alerting, a Nuvio web client, a homelab start page, a Bun SvelteKit adapter, a semantic-release alternative and Dokploy→Pangolin routing. No subscriptions, no seats, no paywalls."
	path="/"
/>

{#snippet chips(list: string[])}
	<div class="flex flex-wrap gap-1.5">
		{#each list as chip (chip)}
			<span class="chip">{chip}</span>{" "}
		{/each}
	</div>
{/snippet}

<main class="mx-auto max-w-page px-6">
	<!-- the hero fills the first screen, then sinks and blurs away as the page scrolls over it -->
	<div class="hero-exit flex min-h-[calc(100svh-6rem)] flex-col justify-center pb-16">
		<span class="tag animate-rise self-start"
			>{data.projects.length} projects &middot; self-hosted &middot; MIT &amp; AGPL</span
		>
		<h1
			class="mt-6.5 text-[clamp(2.8rem,9.5vw,7.5rem)]/[.9] stereo font-extrabold tracking-tighter text-balance *:block *:animate-rise"
		>
			<span>Software that</span>
			<span class="[animation-delay:.08s]">never grew</span>
			<span class="grad pb-[.08em] [animation-delay:.16s]">a pricing page.</span>
		</h1>
		<p class="mt-8 max-w-[62ch] animate-rise text-[1.1rem] text-dim [animation-delay:.28s]">
			I run my own hardware. So I write the tools I need for it: storage, deploys, monitoring,
			streaming, routing. Then I give them away.
			<strong class="font-semibold text-fg"
				>All of it free. All of it open. No seats, no tiers, no &ldquo;contact sales&rdquo;.</strong
			>
		</p>
		<div class="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:.36s]">
			<a class="btn btn-primary" href="#projects">See the projects</a>
			<a class="btn" href="https://github.com/orochibraru?tab=repositories" target="_blank" rel="noopener"
				>GitHub &rarr;</a
			>
		</div>
		<a
			class="group mt-16 flex animate-rise items-center gap-3 self-start text-sm text-dim transition-colors [animation-delay:.6s] hover:text-accent"
			href="#numbers"
		>
			<span class="relative h-10 w-6 rounded-full border border-edge group-hover:border-accent">
				<span
					class="absolute top-2 left-1/2 h-2 w-1 -translate-x-1/2 animate-bounce rounded-full bg-accent motion-reduce:animate-none"
				></span>
			</span>
			Scroll
		</a>
	</div>

	<!-- everything below slides up over the hero -->
	<div class="relative z-10">
		<div class="zone zone-scan">
		<section id="numbers" class="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
			{#each stats as stat (stat.label)}
				<div class="feat">
					<p
						class="bg-linear-to-br from-fg to-dim bg-clip-text text-[clamp(2rem,4vw,3rem)]/none font-extrabold tracking-[-.04em] text-transparent"
					>
						{stat.value}
					</p>
					<p class="mt-2 text-sm text-dim">{stat.label}</p>
				</div>
			{/each}
		</section>

		<div
			class="glass mb-24 overflow-hidden rounded-full py-3.5 text-xs font-semibold tracking-[.2em] whitespace-nowrap text-dim mask-[linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]"
		>
		<div class="inline-block animate-marquee motion-reduce:animate-none">
			FREE FOREVER &nbsp;&middot;&nbsp;
			<b class="font-normal text-accent">NO SUBSCRIPTION</b>
			&nbsp;&middot;&nbsp; SELF-HOSTED &nbsp;&middot;&nbsp;
			<b class="font-normal text-hot">NO TELEMETRY</b>
			&nbsp;&middot;&nbsp; YOUR HARDWARE &nbsp;&middot;&nbsp;
			<b class="font-normal text-accent">YOUR DATA</b>
			&nbsp;&middot;&nbsp; OPEN SOURCE &nbsp;&middot;&nbsp;
			<b class="font-normal text-hot">NO PAYWALL</b>
			&nbsp;&middot;&nbsp; FREE FOREVER &nbsp;&middot;&nbsp;
			<b class="font-normal text-accent">NO SUBSCRIPTION</b>
			&nbsp;&middot;&nbsp; SELF-HOSTED &nbsp;&middot;&nbsp;
			<b class="font-normal text-hot">NO TELEMETRY</b>
			&nbsp;&middot;&nbsp; YOUR HARDWARE &nbsp;&middot;&nbsp;
			<b class="font-normal text-accent">YOUR DATA</b>
			&nbsp;&middot;&nbsp; OPEN SOURCE &nbsp;&middot;&nbsp;
			<b class="font-normal text-hot">NO PAYWALL</b>
			&nbsp;&middot;&nbsp;
		</div>
		</div>
		</div>

		<section id="projects" class="zone zone-split mb-24">
			<div class="mb-8 flex items-end justify-between gap-6">
				<div>
					<h2 class="text-[clamp(2rem,5vw,3.2rem)]/none">The projects</h2>
					<p class="mt-3 max-w-[60ch] text-dim">
						Each one replaces something I used to pay for. Each one runs in a container on a box
						you own.
					</p>
				</div>
			</div>

			<div class="flex flex-col gap-6">
				{#each flagships as project, index (project.repo)}
					<!-- odd ones swap sides, and slide in and out from their own side -->
					<article
						class={[
							"slide glass group grid items-center gap-8 overflow-hidden rounded-4xl p-7 sm:p-10 lg:grid-cols-[2fr_3fr]",
							// each side is a channel: left slides glow crimson, right ones gold
							index % 2 ? "[--from:45%] [--ch:var(--color-cool)]" : "[--from:-45%] [--ch:var(--color-hot)]",
						]}
					>
						<div class={index % 2 ? "lg:order-2" : undefined}>
							<span class="label">{project.category}</span>
							<h3 class="mt-2 text-[clamp(1.8rem,3.5vw,2.6rem)]/none font-extrabold tracking-[-.04em]">
								{project.name}
							</h3>
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
				<h3 class="mt-16 mb-6 text-xl font-bold tracking-[-.02em]">Also in the box</h3>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each others as project (project.repo)}
						<a class="card" href={resolve("/[repo]", { repo: project.repo })}>
							<span class="label">{project.category}</span>
							<h4 class="mt-2.5 mb-2 pr-10 text-[1.35rem] font-bold tracking-[-.02em]">
								{project.name}
							</h4>
							<p class="mb-4.5 text-[.92rem] text-dim">{project.blurb}</p>
							{@render chips(project.chips)}
						</a>
					{/each}
				</div>
			{/if}
		</section>

		{#if data.posts.length}
			<section class="zone zone-grid mb-24">
				<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
					<h2 class="text-[clamp(2rem,5vw,3.2rem)]/none">From the blog</h2>
					<a class="btn" href={resolve("/blog")}>All posts</a>
				</div>
				<div class="grid gap-4 md:grid-cols-3">
					{#each data.posts as post (post.slug)}
						<a class="card" href={resolve("/blog/[slug]", { slug: post.slug })}>
							<span class="label"><time datetime={post.date}>{readable(post.date)}</time></span>
							<h3 class="mt-2.5 mb-2 pr-10 font-sans text-[1.2rem] font-bold tracking-[-.02em]">
								{post.title}
							</h3>
							<p class="text-[.92rem] text-dim">{post.description}</p>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<section id="free" class="mb-22.5">
			<div class="glass relative overflow-hidden rounded-4xl px-8 py-10 sm:px-12 sm:py-14">
				<!-- a slow conic halo behind the manifesto -->
				<div
					class="pointer-events-none absolute -top-1/2 -right-1/4 -z-10 size-160 animate-[spin_40s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--glow-1),var(--glow-3),var(--glow-2),var(--glow-1))] opacity-70 blur-3xl motion-reduce:animate-none"
					aria-hidden="true"
				></div>
				<span class="tag">The deal</span>
				<h2 class="mt-4 mb-4.5 text-[clamp(1.6rem,4vw,2.4rem)] tracking-[-.03em]">
					Everything here is free. Actually free.
				</h2>
				<p class="max-w-[78ch] text-[1.1rem]">
					I&rsquo;m sick of paying for everything. A monthly fee to store my own files. A seat licence
					to deploy my own container. A &ldquo;pro&rdquo; tier to get an alert when my own disk fills
					up. Every tool I liked eventually grew a pricing page and moved the feature I used behind
					it.
				</p>
				<p class="mt-5 max-w-[78ch] text-dim">
					So these are the ones I built instead.
					<b class="font-normal text-accent"
						>No subscription. No seats. No usage limits. No feature held back for an enterprise plan.
						No telemetry phoning home.</b
					>
					Clone it, run it on the box in your closet, fork it if I stop caring. That&rsquo;s the whole
					deal.
				</p>
				<p class="mt-5 max-w-[78ch] text-dim">
					If something&rsquo;s broken, open an issue. If you fix it, open a PR. If you never talk to
					me again and just run it forever. Perfect, that&rsquo;s the point.
				</p>
				<a class="btn mt-8" href={resolve("/about")}>The long version &rarr;</a>
			</div>
		</section>
	</div>
</main>
