<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";
	import Particles from "$lib/components/Particles.svelte";
	import { readable } from "$lib/seo";

	let { data } = $props();

	const guides = $derived(data.projects.reduce((total, project) => total + project.guides, 0));
	const stats = $derived([
		{ value: data.projects.length, label: "projects, all of them open source" },
		{ value: guides, label: "guides, synced from the repos" },
		{ value: "0 €", label: "what any of it costs, forever" },
		{ value: "0", label: "bytes of telemetry sent home" },
	]);

	// The rent a homelab replaces. Illustrative list prices for the hosted equivalents,
	// each paired with the project that does the job for nothing.
	const bill = [
		{ need: "Cloud drive, 2 TB", price: 9.99, repo: "penombre" },
		{ need: "App hosting, per seat", price: 20, repo: "homerun" },
		{ need: "Server alerting, pro tier", price: 15, repo: "baba" },
		{ need: "Start page, synced", price: 3, repo: "bercail" },
	];
	const monthly = bill.reduce((total, line) => total + line.price, 0);
	// written like the "0 €" beside it, so the two read as one column
	const euros = (value: number) => `${value.toFixed(2)} €`;
	const nameOf = (repo: string) => data.projects.find((project) => project.repo === repo)?.name;

	const pattern = [
		{
			title: "It starts free.",
			text: "A generous free tier, a slick onboarding, and every guide on the internet recommends it.",
		},
		{
			title: "Then it grows a pricing page.",
			text: "The feature you rely on moves to Pro. Seats get counted. The free tier shrinks every year.",
		},
		{
			title: "Then leaving costs more than staying.",
			text: "Your files, configs and history live on their servers, in their format. The price goes up, and you pay it.",
		},
	];

	const principles = [
		{ title: "No subscription", text: "Nothing to renew, nothing to cancel, no card on file." },
		{ title: "No seats", text: "Invite the whole household. The count never matters." },
		{ title: "No telemetry", text: "Nothing phones home. What happens on your box stays there." },
		{
			title: "One container",
			text: "Most of it is one image and one volume. Back up a folder, done.",
		},
		{
			title: "Open source",
			text: "MIT and AGPL. Read it, fork it, keep running it if the author disappears.",
		},
		{
			title: "Your hardware",
			text: "An old laptop, a NAS, a mini PC in a closet. That is the whole data centre.",
		},
	];
</script>

<Meta
	title="orochibraru: free, self-hosted software for your homelab"
	description="Free and open-source homelab software: self-hosted drive, a Cloud Run alternative, server alerting, a Nuvio web client, a homelab start page, a Bun SvelteKit adapter, a semantic-release alternative and Dokploy→Pangolin routing. No subscriptions, no seats, no paywalls."
	path="/"
/>

<main class="mx-auto max-w-page px-6">
	<Particles />
	<!-- the hero sits right under the header with the numbers straight after it, so the
	     first screen is all content; it sinks and blurs away as the page scrolls over it -->
	<div class="hero-exit flex flex-col pt-10 pb-14 lg:pt-14">
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
			Storage, deploys, monitoring, streaming, routing: the software a homelab runs on, built to
			live on hardware you own.
			<strong class="font-semibold text-fg"
				>All of it free. All of it open. No seats, no tiers, no &ldquo;contact sales&rdquo;.</strong
			>
		</p>
		<div class="mt-9 flex animate-rise flex-wrap gap-3 [animation-delay:.36s]">
			<a class="btn btn-primary" href={resolve("/projects")}>See the projects</a>
			<a class="btn" href="#problem">Why this exists &darr;</a>
		</div>
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
			class="glass mb-28 overflow-hidden rounded-full py-3.5 text-xs font-semibold tracking-[.2em] whitespace-nowrap text-dim mask-[linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]"
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

		<section id="problem" class="mb-28">
			<span class="tag">The problem</span>
			<h2 class="mt-5 max-w-[18ch] text-[clamp(2.2rem,6vw,4.4rem)]/[.95] tracking-[-.045em] text-balance">
				Everything you rely on is <span class="grad">rented.</span>
			</h2>
			<p class="mt-6 max-w-[64ch] text-[1.1rem] text-dim">
				Files, deploys, alerts, the page you open fifty times a day. Each one is a monthly line on a
				card statement, at a price the vendor can change whenever it wants.
			</p>

			<div class="mt-12 grid items-start gap-6 lg:grid-cols-[5fr_6fr]">
				<ol class="grid gap-4">
					{#each pattern as step, index (step.title)}
						<li class="feat flex gap-5">
							<span
								class="bg-linear-to-br from-hot to-cool bg-clip-text font-mono text-3xl/none font-bold text-transparent"
								>0{index + 1}</span
							>
							<div>
								<h3 class="text-lg font-bold tracking-[-.02em] before:hidden">{step.title}</h3>
								<p class="mt-1.5 text-dim">{step.text}</p>
							</div>
						</li>
					{/each}
				</ol>

				<!-- the bill: each rented line strikes itself out as it scrolls into view -->
				<div class="glass rounded-4xl p-7 sm:p-9">
					<div class="flex items-baseline justify-between gap-4 border-b border-dashed border-edge pb-4">
						<span class="font-mono text-xs tracking-[.2em] text-dim">MONTHLY STATEMENT</span>
						<span class="font-mono text-xs text-dim">hosted vs. self-hosted</span>
					</div>
					<ul class="divide-y divide-dashed divide-line">
						{#each bill as line (line.need)}
							{@const name = nameOf(line.repo)}
							<li class="flex items-center justify-between gap-4 py-4">
								<div>
									<p class="font-medium">{line.need}</p>
									{#if name}
										<p class="mt-0.5 text-sm text-dim">
											or
											<a
												class="text-accent hover:underline"
												href={resolve("/[repo]", { repo: line.repo })}>{name}</a
											>, on your box
										</p>
									{/if}
								</div>
								<div class="flex items-baseline gap-3 font-mono whitespace-nowrap">
									<s class="strike text-sm text-dim no-underline">{euros(line.price)}</s>
									<span class="font-bold text-accent">0 €</span>
								</div>
							</li>
						{/each}
					</ul>
					<div class="flex items-end justify-between gap-4 border-t border-edge pt-5">
						<div>
							<p class="font-mono text-xs tracking-[.2em] text-dim">PER YEAR</p>
							<p class="mt-1 text-sm text-dim">
								<s class="strike no-underline">{euros(monthly * 12)}</s>, every year, for software
								that can change the deal at any time.
							</p>
						</div>
						<p class="font-mono text-[clamp(2rem,4vw,2.8rem)]/none font-extrabold whitespace-nowrap text-accent">
							0 €
						</p>
					</div>
					<p class="mt-5 text-xs text-dim">Illustrative list prices for hosted equivalents.</p>
				</div>
			</div>
		</section>

		<section class="zone zone-grid mb-28">
			<span class="tag">The way out</span>
			<h2 class="mt-5 max-w-[20ch] text-[clamp(2.2rem,6vw,4.4rem)]/[.95] tracking-[-.045em] text-balance">
				Own the box. Run the software. <span class="grad">Keep the data.</span>
			</h2>
			<p class="mt-6 max-w-[64ch] text-[1.1rem] text-dim">
				Every project here does one of those rented jobs, on a machine you already have. No account to
				create, no plan to pick, nobody between you and your data.
			</p>
			<div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each principles as principle (principle.title)}
					<div class="feat">
						<h3>{principle.title}</h3>
						<p class="text-dim">{principle.text}</p>
					</div>
				{/each}
			</div>
		</section>

		<section id="projects" class="mb-28">
			<div class="mb-8 flex flex-wrap items-end justify-between gap-4">
				<div>
					<h2 class="text-[clamp(2rem,5vw,3.2rem)]/none">The projects</h2>
					<p class="mt-3 max-w-[60ch] text-dim">
						Each one replaces a subscription. Each one runs in a container on a box you own.
					</p>
				</div>
				<a class="btn" href={resolve("/projects")}>All projects &rarr;</a>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{#each data.projects as project (project.repo)}
					<a class="card" href={resolve("/[repo]", { repo: project.repo })}>
						<span class="label">{project.category}</span>
						<h3 class="mt-2.5 mb-2 pr-10 text-[1.25rem] font-bold tracking-[-.02em]">
							{project.name}
						</h3>
						<p class="text-[.9rem] text-dim">{project.blurb}</p>
					</a>
				{/each}
			</div>
		</section>

		{#if data.posts.length}
			<section class="zone zone-grid mb-28">
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
					No trial that expires. No feature held back for an enterprise plan. No usage cap waiting
					for the day it matters. The code is on GitHub, the images are on public registries, and
					the licence lets you keep all of it.
				</p>
				<p class="mt-5 max-w-[78ch] text-dim">
					Broken? Open an issue. Fixed it? Open a PR.
					<b class="font-normal text-accent"
						>Never get in touch and just run it for years? That&rsquo;s the point.</b
					>
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a class="btn btn-primary" href={resolve("/projects")}>Pick a project</a>
					<a class="btn" href={resolve("/about")}>The long version &rarr;</a>
				</div>
			</div>
		</section>
	</div>
</main>
