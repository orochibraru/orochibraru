<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";

	const EMAIL = "orochibraru@gmail.com";
	const UPDATED = "15 October 2026";
</script>

<Meta
	title="Penombre privacy: your drive, your server, nothing sent to me"
	description="Privacy notice for Penombre, the self-hosted drive, its mobile and desktop apps and its MCP connector: what stays on your server, the few calls that leave it, and who to ask about your data."
	path="/privacy/penombre"
	trail={[["Privacy", "/privacy"], ["Penombre", "/privacy/penombre"]]}
	twin={false}
/>

<main class="mx-auto max-w-page px-6">
	<article class="prose">
		<div class="pt-10 pb-5">
			<a class="text-sm font-medium text-dim hover:text-accent" href={resolve("/privacy")}
				>&larr; Privacy</a
			>
			<span class="tag ml-3.5">Updated {UPDATED}</span>
			<h1 class="mt-4.5 text-[clamp(2.4rem,6.5vw,4rem)]/none animate-rise stereo font-extrabold tracking-[-.045em]">
				Penombre privacy.
			</h1>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
				Short version: Penombre runs on a server you or someone you trust controls. Your files and
				account live there. I don&rsquo;t host it, can&rsquo;t see it, and nothing in it reports
				back to me.
			</p>
		</div>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What this covers</h2>
			<p>
				Penombre is free, self-hosted software: the server and web app, the Android and iOS apps,
				the desktop sync app, and the MCP server built into every instance (what Claude and other AI
				clients connect to). There is no hosted version, no account with me, no ads and no analytics.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Who is responsible</h2>
			<p>
				Whoever runs a Penombre instance decides what it stores and who can reach it, so under the
				GDPR they are the data controller for it. If that&rsquo;s your own server, that&rsquo;s you.
				If someone else gave you an account, ask them about your data: I have no access to their
				server.
			</p>
			<p class="mt-5">
				I write the software. For questions about what it does with data, email
				<a class="text-accent" href="mailto:{EMAIL}">{EMAIL}</a>.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What stays on your server</h2>
			<ul class="list-disc pl-6">
				<li>your files, their versions (10 per file by default) and the trash, until you empty it</li>
				<li>
					your account: name, email, profile picture, password hash, passkeys, two-factor secrets
					and API keys
				</li>
				<li>sessions, with the IP address and browser they were opened from</li>
				<li>
					share links, with their optional password hash, expiry and download count; signature
					requests record each signer&rsquo;s IP address in the signed document
				</li>
				<li>an activity log, notifications and background jobs</li>
			</ul>
			<p class="mt-5">
				The activity log, notifications and finished jobs are kept until the admin sets a retention
				period, after which older rows are deleted every night. Deleting your account deletes what is
				tied to it. File contents can be encrypted at rest if the admin turns it on.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What leaves your server</h2>
			<ul class="list-disc pl-6">
				<li>
					<strong>Update check:</strong> the server asks GitHub for the latest Penombre release, at most
					once an hour. GitHub sees the server&rsquo;s IP address, nothing else. Admins can turn it off.
				</li>
				<li>
					<strong>Desktop app updates:</strong> released builds check GitHub for a new version every six
					hours. GitHub sees your IP address.
				</li>
				<li>
					<strong>Android scanning:</strong> QR codes and document scans use Google Play services, which
					Google covers in
					<a class="text-accent" href="https://policies.google.com/privacy" target="_blank" rel="noopener"
						>its own privacy policy</a
					>.
				</li>
				<li>
					<strong>What the admin connects:</strong> single sign-on providers and the mail server for
					emails, if configured.
				</li>
			</ul>
			<p class="mt-5">
				No telemetry, no crash reporting to anyone, no fonts or scripts from a CDN, no push service
				in the middle: the apps ask your server for notifications directly. Errors in the web app are
				sent to your own server&rsquo;s log, nowhere else.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Claude and other AI clients</h2>
			<p>
				Connecting an AI client signs it in to your instance with OAuth: you approve it on a consent
				page of your own server, which then gives it an API key named after the client. That key acts
				as you, sees what you see, and lasts until you revoke it under
				<strong>Settings &rarr; API keys</strong>.
			</p>
			<p class="mt-5">
				Through it, the client can list, search, read, write, move and trash your files, and get
				download and upload links that work for 15 minutes. Whatever it reads goes to the AI provider
				and is then covered by their privacy policy (for Claude,
				<a class="text-accent" href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener"
					>Anthropic&rsquo;s</a
				>). Nothing goes through me.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Your device</h2>
			<p>
				The web app sets a session cookie to keep you signed in, a language cookie, and a 12-hour
				cookie when you unlock a password-protected share. It keeps your sort order, editor mode,
				language, last sign-in email and pending uploads in your browser&rsquo;s storage.
			</p>
			<p class="mt-5">
				The iOS app asks for the camera to scan documents and codes; the Android app hands that to
				the system camera and asks only to show notifications. Neither tracks you or reads your
				location or contacts. The desktop app keeps its key in your system keychain.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Your rights</h2>
			<p>
				Under the GDPR you can ask to access, correct, delete or restrict your data, or object to how
				it is used. Ask the person who runs your instance: they hold the data. You can delete your
				own account from its settings. You can also complain to your data protection authority (in
				France, the
				<a class="text-accent" href="https://www.cnil.fr/en/complaints" target="_blank" rel="noopener"
					>CNIL</a
				>).
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Changes</h2>
			<p>
				If what Penombre collects or sends changes, this page changes with it, and the date at the
				top gets updated.
			</p>
		</section>
	</article>
</main>
