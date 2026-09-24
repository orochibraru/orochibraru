<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";

	const EMAIL = "orochibraru@gmail.com";
	const UPDATED = "17 September 2026";
</script>

<Meta
	title="Privacy: what this site collects, which is almost nothing"
	description="GDPR privacy notice for orochibraru.com: self-hosted, cookie-free Umami analytics and server access logs, kept in the EU and never shared. What is collected, why, for how long, and your rights."
	path="/privacy"
	trail={[["Privacy", "/privacy"]]}
/>

<main class="mx-auto max-w-page px-6">
	<article class="prose">
		<div class="pt-10 pb-5">
			<a class="text-sm font-medium text-dim hover:text-accent" href={resolve("/")}
				>&larr; Home</a
			>
			<span class="tag ml-3.5">Updated {UPDATED}</span>
			<h1 class="mt-4.5 text-[clamp(2.4rem,6.5vw,4rem)]/none animate-rise stereo font-extrabold tracking-[-.045em]">
				Privacy.
			</h1>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
				Short version: cookie-free visit statistics and short-lived server logs, on servers in the
				EU that I run, shared with nobody.
			</p>
		</div>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Who is responsible</h2>
			<p>
				The data controller for orochibraru.com, under the EU General Data Protection Regulation
				(GDPR), is orochibraru, a private individual running a non-commercial site. For anything
				about your data, email <a class="text-accent" href="mailto:{EMAIL}">{EMAIL}</a>.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Visit statistics</h2>
			<p>
				This site uses <a class="text-accent" href="https://umami.is" target="_blank" rel="noopener"
					>Umami</a
				>, open-source analytics, self-hosted at <code>anal.orochibraru.com</code>. On each page view
				it records:
			</p>
			<ul class="mt-5 list-disc pl-6">
				<li>the page URL and the referring site, if any</li>
				<li>browser, operating system and device type</li>
				<li>screen size and browser language</li>
				<li>country, region and city, looked up from your IP address</li>
			</ul>
			<p class="mt-5">
				It sets <strong>no cookies</strong> and stores nothing on your device. Your IP address is
				used at the moment of the visit and never saved. To group page views into a visit, Umami
				keeps a one-way hash of your IP address and browser details, mixed with a secret that
				changes every month, so visits can&rsquo;t be linked across months, across other sites, or
				back to you by name.
			</p>
			<ul class="mt-5 list-disc pl-6">
				<li>
					<strong>Purpose:</strong> seeing which pages get read and where readers come from, to decide
					what to write and fix.
				</li>
				<li>
					<strong>Legal basis:</strong> legitimate interest (GDPR Art. 6(1)(f)) in measuring the audience
					of this site, in a way built not to identify or profile you.
				</li>
				<li><strong>Retention:</strong> 25 months, then deleted.</li>
			</ul>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Server logs</h2>
			<p>
				Like any web server, this one logs each request: your IP address, the date and time, the URL
				requested, the response status, the referrer and your browser&rsquo;s user agent.
			</p>
			<ul class="mt-5 list-disc pl-6">
				<li>
					<strong>Purpose:</strong> keeping the site running and secure, and investigating errors and
					abuse.
				</li>
				<li><strong>Legal basis:</strong> legitimate interest (GDPR Art. 6(1)(f)).</li>
				<li><strong>Retention:</strong> 14 days, then deleted.</li>
			</ul>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Where it goes</h2>
			<p>
				Nowhere. The site and the analytics run on servers in the European Union, and no data is
				transferred outside it. Nothing is sold, shared with third parties, used for advertising, or
				used for automated decisions about you.
			</p>
			<p class="mt-5">
				No accounts, no forms, no newsletter, no embeds, no ads. The light or dark theme you pick is
				saved in your browser&rsquo;s local storage and never sent anywhere.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Your rights</h2>
			<p>Under the GDPR you can ask to:</p>
			<ul class="mt-5 list-disc pl-6">
				<li>access the data held about you, or get a copy of it</li>
				<li>have it corrected or deleted</li>
				<li>restrict how it is used</li>
				<li>object to it being processed at all</li>
			</ul>
			<p class="mt-5">
				Email <a class="text-accent" href="mailto:{EMAIL}">{EMAIL}</a> and you&rsquo;ll get an answer within
				a month. Because nothing here is tied to a name, I may need details such as your IP address and
				the approximate time of your visit to find your data.
			</p>
			<p class="mt-5">
				To object without asking: block <code>anal.orochibraru.com</code> with any content blocker.
				No statistics are collected and the site works exactly the same.
			</p>
			<p class="mt-5">
				If you think your data is being mishandled, you can complain to the French data protection
				authority, the
				<a class="text-accent" href="https://www.cnil.fr/en/complaints" target="_blank" rel="noopener"
					>CNIL</a
				>, or to the authority in your own EU country.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Changes</h2>
			<p>
				If what this site collects changes, this page changes with it, and the date at the top gets
				updated.
			</p>
		</section>
	</article>
</main>
