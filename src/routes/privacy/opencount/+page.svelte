<script lang="ts">
	import { resolve } from "$app/paths";
	import Meta from "$lib/components/Meta.svelte";

	const EMAIL = "orochibraru@gmail.com";
	const UPDATED = "26 October 2026";
</script>

<Meta
	title="OpenCount privacy: your groups, your expenses, nobody else's business"
	description="Privacy notice for OpenCount, the self-hosted Tricount alternative, and its hosted instance at app.opencount.eu: what is stored, who sees it, how long it is kept, what leaves the server, and your rights."
	path="/privacy/opencount"
	trail={[["Privacy", "/privacy"], ["OpenCount", "/privacy/opencount"]]}
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
				OpenCount privacy.
			</h1>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
				Short version: your account, your groups and your expenses sit in one database on one
				server. The people in your group see what you share with the group. Nobody else does, nothing
				is sold, and there are no ads, analytics or trackers.
			</p>
		</div>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What this covers</h2>
			<p>
				OpenCount is free, open-source software for splitting expenses. It comes two ways: the
				instance I run at <code>app.opencount.eu</code>, and copies anyone can run on their own
				server. The software behaves the same in both, so everything below about what it stores and
				sends holds for both. Who is responsible for the data is the part that differs.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Who is responsible</h2>
			<p>
				For <code>app.opencount.eu</code>, the data controller under the GDPR is orochibraru, a
				private individual running a non-commercial service. For anything about your data, email
				<a class="text-accent" href="mailto:{EMAIL}">{EMAIL}</a>.
			</p>
			<p class="mt-5">
				For any other instance, whoever runs it is the controller. If someone else gave you an
				account, ask them about your data: I have no access to their server.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What is stored, and why</h2>
			<ul class="list-disc pl-6">
				<li>
					<strong>Your account:</strong> name, email address, a hash of your password, and if you set them
					up, your passkeys, authenticator app secret and backup codes. If you sign in with single sign-on,
					the provider&rsquo;s ID for you and the tokens it hands back.
				</li>
				<li>
					<strong>Sessions:</strong> one per signed-in device, with the IP address and browser it was opened
					from.
				</li>
				<li>
					<strong>Groups:</strong> their name and currency, and their members. A member can be added by name
					before they have an account, so a group can hold the name of someone who never signed up.
				</li>
				<li>
					<strong>Expenses:</strong> description, amount, date, category, merchant, who paid and how it is
					split. Repeating expenses too.
				</li>
				<li>
					<strong>Invites and sign-up codes:</strong> the email address an invite was sent to, and short-lived
					codes, stored hashed.
				</li>
				<li><strong>Appearance:</strong> your theme, accent colour, font and corners.</li>
			</ul>
			<p class="mt-5">
				All of it exists to run the service you signed up for: splitting expenses with your groups
				and keeping your account secure. The legal basis is the performance of that service (GDPR Art.
				6(1)(b)). Names of people added without an account, and the expenses they are part of, are
				held on the basis of the group&rsquo;s legitimate interest in keeping its accounts straight (Art.
				6(1)(f)).
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Who sees what</h2>
			<ul class="list-disc pl-6">
				<li>
					<strong>Members of a group</strong> see its members, including each member&rsquo;s account email,
					every expense in it and everyone&rsquo;s balance. Nobody outside the group can open it.
				</li>
				<li>
					<strong>The instance admin</strong> sees the list of accounts (name, email, role, whether two-factor
					is on, when they were created) and the invites sent. The app gives admins no way into a group they
					are not a member of.
				</li>
				<li>
					<strong>Nobody else.</strong> Nothing is sold, shared with third parties, used for advertising, or
					used for automated decisions about you.
				</li>
			</ul>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Receipts</h2>
			<p>
				If the admin turns on receipt reading, you can scan a photo or PDF of a receipt to fill in an
				expense. The file is read in the server&rsquo;s memory by
				<a class="text-accent" href="https://tesseract-ocr.github.io/" target="_blank" rel="noopener"
					>Tesseract</a
				>, an open-source text recogniser running on the same server, and dropped as soon as the
				reading is done. It is never saved, and never sent to any outside service. Only the amount,
				date and merchant it found go back to your form.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">How long it is kept</h2>
			<ul class="list-disc pl-6">
				<li>
					<strong>Your account</strong> and what is tied to it: until it is deleted.
				</li>
				<li>
					<strong>Groups and their expenses:</strong> until the group is deleted by the person who made it.
				</li>
				<li>
					<strong>Sessions:</strong> until you sign out or they expire.
				</li>
				<li>
					<strong>Sign-up codes:</strong> 15 minutes.
				</li>
				<li>
					<strong>Emails waiting to be sent</strong> (and so their recipient and contents): deleted 7 days
					after they go out.
				</li>
				<li>
					<strong>Server logs:</strong> each request&rsquo;s method, path, status and duration, with no IP
					address, browser or account attached. They stay on the server.
				</li>
			</ul>
			<p class="mt-5">
				Deleting an account deletes its sign-in details, sessions, passkeys, two-factor secrets and
				appearance. It does not delete your share of a group&rsquo;s history: the other members still
				need their balances to add up, so the expenses you paid or owed stay in the group under the
				name you had in it. Ask the group to delete it if you want those gone too.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">What leaves the server</h2>
			<ul class="list-disc pl-6">
				<li>
					<strong>Emails:</strong> sign-up codes and invites go out through the mail server the admin
					configured, which sees the recipient and the message.
				</li>
				<li>
					<strong>Single sign-on:</strong> if you sign in through a provider the admin added, that provider
					sees the sign-in, under its own privacy policy.
				</li>
			</ul>
			<p class="mt-5">
				That is the whole list. No telemetry, no update checks, no analytics, no fonts or scripts from
				a CDN. Error reporting and tracing exist in the software for self-hosters who point them at
				their own tools; on <code>app.opencount.eu</code> both are off.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Your device</h2>
			<p>
				OpenCount sets a session cookie to keep you signed in, short-lived cookies while you sign up,
				sign in with two-factor or a passkey, or use single sign-on, and a cookie to skip two-factor
				on a device you tick as trusted. They are all needed for signing in, so there is no banner
				asking about them.
			</p>
			<p class="mt-5">
				Your browser&rsquo;s local storage keeps your light or dark theme so a reload doesn&rsquo;t
				flash. Installed as an app, it caches the app&rsquo;s own code and icons for speed, never your
				groups or expenses.
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
				On <code>app.opencount.eu</code>, email
				<a class="text-accent" href="mailto:{EMAIL}">{EMAIL}</a> from the address on your account and
				you&rsquo;ll get an answer within a month. That includes deleting your account, which the app
				doesn&rsquo;t let you do yourself yet. On another instance, ask whoever runs it: they hold the
				data.
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
				If what OpenCount collects or sends changes, this page changes with it, and the date at the top
				gets updated.
			</p>
		</section>
	</article>
</main>
