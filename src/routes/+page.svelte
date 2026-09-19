<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";

	let { data } = $props();
</script>

<Meta
	title="orochibraru: free, self-hosted software for your homelab"
	description="Free and open-source homelab software: self-hosted drive, a Cloud Run alternative, server alerting, a Nuvio web client, a homelab start page, a Bun SvelteKit adapter, a semantic-release alternative and Dokploy→Pangolin routing. No subscriptions, no seats, no paywalls."
	path="/"
/>

<main class="mx-auto max-w-page px-6">
	<div class="pt-15 pb-22.5">
		<span class="tag">{data.projects.length} projects &middot; self-hosted &middot; MIT &amp; AGPL</span>
		<h1
			class="mt-6.5 text-[clamp(2.6rem,9vw,6.2rem)]/[.92] font-extrabold tracking-[-.03em] text-balance"
		>
			Software that<br>never grew<br>
			<span class="bg-linear-to-r from-acid via-cyan to-plasma bg-clip-text text-transparent"
				>a pricing page.</span
			>
		</h1>
		<p class="mt-7 max-w-[68ch] text-[1.05rem] text-dim">
			I run my own hardware. So I write the tools I need for it: storage, deploys, monitoring,
			streaming, routing. Then I give them away.
			<strong class="font-semibold text-fg"
				>All of it free. All of it open. No seats, no tiers, no &ldquo;contact sales&rdquo;.</strong
			>
		</p>
		<div class="mt-9 flex flex-wrap gap-3">
			<a class="btn btn-primary" href="#projects">See the projects</a>
			<a class="btn" href="https://github.com/orochibraru?tab=repositories" target="_blank" rel="noopener"
				>GitHub &rarr;</a
			>
		</div>
	</div>

	<div
		class="mb-20 overflow-hidden border-y border-line py-3 text-xs tracking-[.3em] whitespace-nowrap text-dim uppercase"
	>
		<div class="inline-block animate-marquee motion-reduce:animate-none">
			FREE FOREVER &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">NO SUBSCRIPTION</b>
			&nbsp;&middot;&nbsp; SELF-HOSTED &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">NO TELEMETRY</b>
			&nbsp;&middot;&nbsp; YOUR HARDWARE &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">YOUR DATA</b>
			&nbsp;&middot;&nbsp; OPEN SOURCE &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">NO PAYWALL</b>
			&nbsp;&middot;&nbsp; FREE FOREVER &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">NO SUBSCRIPTION</b>
			&nbsp;&middot;&nbsp; SELF-HOSTED &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">NO TELEMETRY</b>
			&nbsp;&middot;&nbsp; YOUR HARDWARE &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">YOUR DATA</b>
			&nbsp;&middot;&nbsp; OPEN SOURCE &nbsp;&middot;&nbsp;
			<b class="font-normal text-acid">NO PAYWALL</b>
			&nbsp;&middot;&nbsp;
		</div>
	</div>

	<section id="projects" class="mb-22.5">
		<div class="mb-7 flex items-baseline gap-4">
			<h2 class="text-2xl font-bold tracking-[-.02em]">The projects</h2>
			<div class="h-px flex-1 bg-line"></div>
			<span class="text-xs tracking-[.2em] text-dim"
				>{String(data.projects.length).padStart(2, "0")}</span
			>
		</div>
		<div class="grid gap-px border border-line bg-line sm:grid-cols-2">
			{#each data.projects as project (project.repo)}
				<a class="card" href={resolve("/[repo]", { repo: project.repo })}>
					<span class="text-[11px] uppercase tracking-[.18em] text-plasma">{project.category}</span>
					<h3 class="mt-2.5 mb-2 text-[1.35rem] font-bold tracking-[-.02em] transition-colors">
						{project.name}
					</h3>
					<p class="mb-4.5 text-[.92rem] text-dim">{project.blurb}</p>
					<div class="flex flex-wrap gap-1.5">
						{#each project.chips as chip (chip)}
							<span class="chip">{chip}</span>{" "}
						{/each}
					</div>
				</a>
			{/each}
		</div>
	</section>

	<section id="free" class="mb-22.5">
		<div class="border border-line bg-surface px-8 py-10">
			<span class="tag">The deal</span>
			<h2 class="mt-4 mb-4.5 text-[clamp(1.6rem,4vw,2.4rem)] font-bold tracking-[-.03em]">
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
				<b class="font-normal text-acid"
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
</main>
