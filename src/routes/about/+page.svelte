<script lang="ts">
	import Meta from "#lib/components/Meta.svelte";
	import { resolve } from "$app/paths";

	const structuredData = [
		{
			"@context": "https://schema.org",
			"@type": "AboutPage",
			url: "https://zedensix.com/about",
			isPartOf: { "@id": "https://zedensix.com/#website" },
			mainEntity: {
				"@type": "Person",
				"@id": "https://zedensix.com/#person",
				name: "zedensix",
				description:
					"Self-taught software engineer with ten years of experience, building free self-hosted tools for homelabs.",
				url: "https://zedensix.com/about",
				sameAs: ["https://github.com/zedensix", "https://hub.docker.com/u/zedensix"],
				knowsAbout: ["self-hosting", "homelab", "Docker", "SvelteKit", "Bun", "TypeScript"],
			},
		},
	];
</script>

<Meta
	title="About: a self-taught engineer who is done paying rent on software"
	description="Ten years self-taught, building free self-hosted tools. How these projects get built, what AI actually does here, and why a pricing page makes me angry enough to rewrite the thing."
	path="/about"
	ogType="profile"
	trail={[["About", "/about"]]}
	structuredData={structuredData}
/>

<main class="mx-auto max-w-page px-6">
	<article class="prose">
		<div class="pt-10 pb-5">
			<a
				class="text-sm font-medium text-dim hover:text-accent"
				href={resolve("/")}
			>← Home</a>

			<span class="tag ml-3.5">Self-taught · 10 years</span>

			<div class="mt-4.5 flex flex-wrap items-center gap-7">
				<enhanced:img
					src="#lib/assets/avatar.jpg"
					alt="zedensix’s avatar"
					class="block size-28 shrink-0 rounded-4xl border border-line object-cover shadow-[0_0_40px_-8px_var(--color-accent)]"
					loading="eager"
				></enhanced:img>

				<h1
					class="text-[clamp(2.4rem,6.5vw,4rem)]/none animate-rise stereo font-extrabold tracking-[-.045em]"
				>
					Who’s writing
					<br />
					<span class="grad">all this.</span>
				</h1>
			</div>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
				A self-taught engineer, ten years in, who keeps ending up writing the tool instead of paying
				for it.
			</p>
		</div>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Overview</h2>
			<p>
				Everything here is free, open source and self-hosted: tools I run on my own hardware every
				day, built on evenings around a day job, and given away. AI does the chores, the design
				and the decisions are mine, and there will never be a pricing page. The rest of this page
				is the long version.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">How this gets built</h2>
			<p>
				Ten years of writing software, none of it taught to me by an institution. Everything I know
				came from building something, breaking it, and reading the source of whatever I broke.
			</p>
			<p class="mt-5">I use AI to write software. Not in the way that sentence has come to mean.</p>
			<p class="mt-5">
				Think of it as a junior dev team. An intern on crack, if you prefer. It does the work I have already done a hundred times: the seventeenth CRUD endpoint, splitting a 900-line file into modules that make sense, chasing a linter through a rename, writing the fourth example of a pattern that’s already documented three times, converting a type definition I could type out myself but would resent. Chores. The parts of this job that are typing, not thinking.
			</p>
			<p class="mt-5">
				<strong>The core logic is mine. The ideas are all mine.</strong>
				The architecture, the data model, the trade-offs, the awkward part in the middle that took three attempts: that’s me, and it’s the part I’d defend line by line at a whiteboard. An intern doesn’t get to decide what the product is.
			</p>
			<p class="mt-5">
				What doesn’t ship is slop. If I can’t explain why a function exists, it doesn’t go in. Generated code gets read, cut down, and usually rewritten before it lands, same as a junior’s PR. The tool changed how fast I get through the boring 70%. It didn’t change who’s responsible for the other 30%, or for all of it when it breaks at 3am.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">The part some of you will hate</h2>
			<p>
				I know how that paragraph lands. Some people will judge it, some will call the whole thing slop on principle without opening a single file, and a few will write off every project here over one sentence. That’s fine, genuinely. I’d rather say it plainly on my own site than have it treated as something I hid, and I’m not going to soften it in a README to keep a star.
			</p>
			<p class="mt-5">So here is the trade-off, stated straight.</p>
			<p class="mt-5">
				I work full time. I have other passions and no shortage of ways to spend an evening. So when
				I choose to put my own hours into something and then hand it over for nothing, those hours
				had better land somewhere that matters. Two hours splitting one file into four is not that.
				Neither is rewriting two hundred tests after a rename, or typing out the fourth variation of
				an example that already exists three times. That work is real and it has to happen. It is
				also worth none of my Saturday.
			</p>
			<p class="mt-5">
				So it gets delegated, and what’s left is the part that actually needed a person: what the thing is, how it’s shaped, what it deliberately refuses to do, and every decision you could reasonably argue with me about. That’s where the evenings go. The alternative here isn’t a purer version of these projects. The alternative is that most of them don’t exist.
			</p>
			<p class="mt-5">
				If that still bothers you, sit with the actual counterfactual for a second. Most of what is
				on this site would never have seen the light of day. The ideas were mine and they always
				were, and several of these started life as betas written entirely by hand that ran perfectly
				well on my own box. They were also nowhere near as polished, nowhere near as stable, and
				frankly not as pretty. They were the version you build for yourself and would never hand to
				a stranger.
			</p>
			<p class="mt-5">
				If it comforts you: yes, this stuff would probably have made it out eventually. At some
				point. But carrying around the frustration of not having the time to build it, for the next
				five to ten years, is not much of a plan.
			</p>
			<p class="mt-5">
				While I’m being clear about what this is for: it isn’t recognition, and it certainly isn’t approval.
				<strong>I write this software because I run this software.</strong>
				It sits on my hardware, I use it every day, and that alone is what justifies the hours and
				the AI credits it burns. Every project on this site would exist in exactly the same shape if
				nobody else ever cloned it.
			</p>
			<p class="mt-5">
				Giving it away is a bonus, not the point. So if AI in the loop is a dealbreaker for you, that is genuinely fine: don’t use it. Too bad for you. I use it, it works, and it’s stable enough for everything I trust it with, in no small part thanks to test suites the same intern wrote. That’s good enough for me. If it turns out to be good enough for you too, then that’s fucking great.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Why all of it is free</h2>
			<p>
				Two answers. The boring one first:
				<strong>I don’t need the money.</strong>
				That day job pays well, and nothing on this site has to earn its keep. That matters more than it sounds. Software that doesn’t need revenue never needs to grow, convert, retain, or justify itself in somebody’s quarterly review. There is no tier to invent, because there is no number anyone is asking me to move.
			</p>
			<p class="mt-5">
				The second answer is that I’m picky. Annoyingly, unproductively picky. I notice the loading state that flashes, the setting that silently doesn’t persist, the modal that eats what you typed when you hit Escape, the empty state nobody designed. Most people see software. I see the seams.
			</p>
			<p class="mt-5">
				That pickiness is most of why these projects exist at all. I used something, it annoyed me
				in the same exact spot for the fifth time, and at some point rewriting it became less
				painful than continuing to be annoyed by it. Every repo on the front page started as a
				grudge.
			</p>

			<p class="mt-5">So I was already cynical about software. Then there’s the pricing page.</p>

			<p class="mt-5">
				A pricing page is where the cynicism stops being funny and turns into actual anger, and it’s always the same story. You find a good tool. It’s free, or nearly, and it does one thing properly. You build a habit around it. You put your data in it. You recommend it to people. Eighteen months later there’s a funding round, and the feature you actually used has quietly moved one tier up. A year after that the tier is called Enterprise and the price is
				<b class="font-normal text-accent">“Contact sales”</b>
				, which isn’t a price, it’s a process for working out how much you can be made to pay.
			</p>
			<p class="mt-5">
				Then it gets specific, and stupid. Per-seat pricing, for a homelab whose entire headcount is me. Usage limits on hardware I bought, running on electricity I pay for, sitting in a cupboard I already pay rent on. A monthly fee, forever, for software that was finished two years ago and has shipped nothing since but a redesign. Telemetry I didn’t agree to, so the thing I’m paying for can study me and sell what it learns. An alert when my own disk fills up, gated behind Pro (or worse, fucking Enterprise).
			</p>
			<p class="mt-5">
				And the part that actually gets me: none of it is really about the money. I’d pay for good software. I have, plenty of times, gladly. What I won’t do is
				<strong>rent permission to use my own machine</strong>
				. That’s the line. The moment your subscription lapsing turns my drive read-only, my files aren’t mine and never were. That isn’t a product, it’s a hostage arrangement with a nice onboarding flow.
			</p>
			<p class="mt-5">
				So:
				<b class="font-normal text-accent">no pricing page.</b>
				Not now, not at v2, not if one of these somehow takes off. There are no tiers, which means there is nothing to move behind one. No seats to count. No telemetry to phone home. Run it on the box in your closet and never speak to me. And if I get bored, or hit by a bus, the licence means you don’t need me. Fork it and carry on. That’s the whole point of giving it away instead of selling it.
			</p>
		</section>

		<section class="mb-22.5">
			<div class="mb-7 flex items-baseline gap-4">
				<h2 class="text-2xl font-bold tracking-[-.02em]">Elsewhere</h2>
				<div class="h-px flex-1 bg-line"></div>
			</div>
			<div class="flex flex-wrap gap-2.5">
				<a class="btn btn-primary" href={resolve('projects')}>See the projects</a>

				<a
					class="btn"
					href="https://github.com/zedensix?tab=repositories"
					target="_blank"
					rel="noopener"
				>GitHub →</a>

				<a
					class="btn"
					href="https://hub.docker.com/u/zedensix"
					target="_blank"
					rel="noopener"
				>Docker Hub →</a>
			</div>
		</section>
	</article>
</main>
