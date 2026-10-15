<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";

	const EMAIL = "orochibraru@gmail.com";
	const UPDATED = "15 October 2026";
</script>

<Meta
	title="Homerun privacy: your platform, your server, nothing sent to me"
	description="Privacy notice for Homerun, the self-hosted PaaS, and its MCP connector: what it stores on your server, the calls that leave it, how long things are kept, and who to ask about your data."
	path="/privacy/homerun"
	trail={[["Privacy", "/privacy"], ["Homerun", "/privacy/homerun"]]}
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
				Homerun privacy.
			</h1>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
				Short version: Homerun runs on your own server. Your account, your services and their logs
				live there. I don&rsquo;t host it, can&rsquo;t see it, and nothing in it reports back to me.
			</p>
		</div>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What this covers</h2>
			<p>
				Homerun is free, self-hosted software: the dashboard and its server, the installer, the
				command-line tool, and the MCP server built into every instance (what Claude and other AI
				clients connect to). There is no hosted version, no account with me and no analytics.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Who is responsible</h2>
			<p>
				Whoever runs a Homerun instance decides what it stores, so under the GDPR they are the data
				controller for it, including for the visitors of the apps it hosts. If it&rsquo;s your
				server, that&rsquo;s you. I have no access to it.
			</p>
			<p class="mt-5">
				I write the software. For questions about what it does with data, email
				<a class="text-accent" href="mailto:{EMAIL}">{EMAIL}</a>.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What stays on your server</h2>
			<ul class="list-disc pl-6">
				<li>
					accounts: name, email, profile picture, password hash, passkeys, two-factor secrets, API
					keys and the date of the last sign-in
				</li>
				<li>sessions, with the IP address and browser they were opened from</li>
				<li>an audit log of API requests made with service accounts, including their IP address</li>
				<li>banned IP addresses, and the requests they made while banned</li>
				<li>
					what your services produce: logs, error events and traces from your apps, traffic and
					uptime numbers
				</li>
			</ul>
			<p class="mt-5">Most of it is trimmed on its own:</p>
			<ul class="mt-5 list-disc pl-6">
				<li>traces: 7 days by default, up to 90</li>
				<li>finished jobs: 7 days</li>
				<li>error events: 30 days</li>
				<li>traffic and uptime samples: 1 year</li>
				<li>
					the audit log, app log and notification feed: the latest 20,000, 5,000 and 200 entries
				</li>
			</ul>
			<p class="mt-5">
				Deleting an account deletes its sessions, sign-in methods and notification channels.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What leaves your server</h2>
			<ul class="list-disc pl-6">
				<li>
					<strong>Update check:</strong> when an admin opens the dashboard, the server asks GitHub for the
					latest Homerun release, at most every 10 minutes. GitHub sees the server&rsquo;s IP address,
					nothing else. The command-line tool only checks when you run its update command.
				</li>
				<li>
					<strong>Features you use:</strong> service icons from jsDelivr, image tags from Docker Hub, the
					vulnerability database for image scans, extensions from Open VSX, and Docker and Homerun
					downloads when installing a node. These requests come from your server and carry no
					personal data.
				</li>
				<li>
					<strong>What you connect:</strong> DNS providers, GitHub, GitLab or Bitbucket, single sign-on
					providers, S3 storage for backups, and notification channels (email, webhooks, Discord, Slack,
					Telegram, browser push). Each gets what you send it, under its own privacy policy.
				</li>
			</ul>
			<p class="mt-5">
				No telemetry, no crash reporting to anyone, no fonts or scripts from a CDN in your browser.
				The error tracking in Homerun receives errors from your apps; it sends nothing out.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Claude and other AI clients</h2>
			<p>
				Connecting an AI client signs it in to your instance with OAuth: you approve it on your own
				server, which gives it a token for the MCP endpoint only. It can ask for your profile, email
				and groups, and acts with your account&rsquo;s permissions.
			</p>
			<p class="mt-5">
				Through it, the client can read and change what you can: services, configs, deployments,
				logs, errors, monitoring, DNS records, users and notification channels. Values that look
				like secrets, such as passwords, tokens and keys, are redacted before it sees them. Revoke access on the
				identity provider page or under <strong>Profile &rarr; API Keys</strong>.
			</p>
			<p class="mt-5">
				Whatever it reads goes to the AI provider and is then covered by their privacy policy (for
				Claude,
				<a class="text-accent" href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener"
					>Anthropic&rsquo;s</a
				>). Nothing goes through me.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Your browser</h2>
			<p>
				The dashboard sets a session cookie to keep you signed in, a cookie for apps behind its login
				wall, short-lived cookies (10 minutes) while connecting a Git provider or testing single
				sign-on, and a cookie with your time zone so charts match your clock. It keeps the theme, view
				modes, navigation state and diagram layouts in your browser&rsquo;s storage.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Your rights</h2>
			<p>
				Under the GDPR you can ask to access, correct, delete or restrict your data, or object to how
				it is used. Ask the person who runs the instance: they hold the data. You can also complain to
				your data protection authority (in France, the
				<a class="text-accent" href="https://www.cnil.fr/en/complaints" target="_blank" rel="noopener"
					>CNIL</a
				>).
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Changes</h2>
			<p>
				If what Homerun collects or sends changes, this page changes with it, and the date at the top
				gets updated.
			</p>
		</section>
	</article>
</main>
