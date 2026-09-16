<script lang="ts">
	import { resolve } from "$app/paths";
	import deploy from "$docs/homerun/images/deploy.webp";
	import deployDark from "$docs/homerun/images/deploy-dark.webp";
	import hero from "$docs/homerun/images/hero.webp";
	import heroDark from "$docs/homerun/images/hero-dark.webp";
	import logs from "$docs/homerun/images/logs.webp";
	import logsDark from "$docs/homerun/images/logs-dark.webp";
	import networking from "$docs/homerun/images/networking.webp";
	import networkingDark from "$docs/homerun/images/networking-dark.webp";
	import service from "$docs/homerun/images/service.webp";
	import serviceDark from "$docs/homerun/images/service-dark.webp";
	import settings from "$docs/homerun/images/settings.webp";
	import settingsDark from "$docs/homerun/images/settings-dark.webp";
	import stack from "$docs/homerun/images/stack.webp";
	import stackDark from "$docs/homerun/images/stack-dark.webp";
	import templates from "$docs/homerun/images/templates.webp";
	import templatesDark from "$docs/homerun/images/templates-dark.webp";
	import Meta from "$lib/components/Meta.svelte";
	import { SITE } from "$lib/seo";

	const structuredData = [
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: "Homerun",
			applicationCategory: "DeveloperApplication",
			applicationSubCategory: "Platform as a Service",
			operatingSystem: "Linux, Docker",
			description:
				"Homerun is a free, self-hosted single-host PaaS and a Dokploy, Coolify, Dokku and Cloud Run alternative: deploy Docker images or git repos from a form, get TLS routing via Traefik. Nothing paywalled.",
			url: "https://orochibraru.com/homerun",
			screenshot: `${SITE}${heroDark}`,
			softwareHelp: "https://orochibraru.com/homerun/docs",
			isAccessibleForFree: true,
			keywords:
				"Dokploy alternative, Coolify alternative, Dokku alternative, CapRover alternative, Cloud Run alternative, AWS alternative, Heroku alternative, self-hosted PaaS, homelab deploys",
			featureList: [
				"Deploy any Docker image or build from a git repository Dockerfile",
				"Live streamed deploy progress that survives a page reload",
				"Deployment history with logs and image digests",
				"Stacks grouping services on a shared Docker network",
				"A catalog of ~58 one-click templates with Quick Deploy and linked companion containers",
				"Connect GitHub, GitLab, Gitea or Bitbucket and browse your repositories",
				"docker-compose.yaml import",
				"Automatic connection URLs between linked services",
				"Container logs, uptime probes and an in-browser web terminal",
				"Live host CPU, memory, disk and GPU usage on the dashboard",
				"Setup diagnostics that deep-link into the setting they are complaining about",
				"Traefik TLS routing, custom domains and bring-your-own certificates",
				"Remote build servers over TCP, SSH or the Homerun Agent, with a registry layer cache",
				"Optional Docker Swarm mode for replica scaling",
				"Scheduled jobs, auto-redeploy and S3 volume backups, on one Scheduling page",
				"Reusable S3 destinations and a searchable backup history",
				"Traefik system logs, with restart and update from the dashboard",
				"A per-account notification feed for deploys, lifecycle events and errors",
				"Configured from the dashboard: a first-run wizard and live settings, no config file",
				"REST API with OpenAPI and a CLI with device-code login",
				"Users, roles, invites, sessions, API keys and OAuth/OIDC login",
				"Cloudflare and Pangolin DNS automation",
			],
			codeRepository: "https://github.com/orochibraru/homerun",
			sameAs: ["https://hub.docker.com/r/orochibraru/homerun"],
			author: { "@id": "https://orochibraru.com/#person" },
			offers: {
				"@type": "Offer",
				price: "0",
				priceCurrency: "USD",
				availability: "https://schema.org/InStock",
			},
		},
	];
</script>

<Meta
	title="Homerun: a free self-hosted PaaS, a Dokploy and Coolify alternative"
	description="Homerun is a free, self-hosted single-host PaaS and a Dokploy, Coolify, Dokku and Cloud Run alternative: deploy Docker images or git repos from a form, get TLS routing via Traefik. Nothing paywalled."
	path="/homerun"
	image={{
	url: `${SITE}${heroDark}`,
	width: 1200,
	height: 675,
	alt: "The Homerun dashboard, showing service counts and live host resources",
}}
	trail={[["Homerun", "/homerun"]]}
	{structuredData}
/>

<main class="mx-auto max-w-page px-6">
	<article class="prose">
		<div class="pt-10 pb-5">
			<a
				class="text-xs uppercase tracking-widest text-dim hover:text-acid"
				href={resolve("/#projects")}
				>&larr; All projects</a
			>
			<span class="tag ml-3.5">Deploys &middot; Self-hosted PaaS</span>
			<h1 class="mt-4.5 text-[clamp(2.4rem,8vw,4.6rem)]/none font-extrabold tracking-[-.03em]">
				Homerun
			</h1>
			<p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
				A single-host PaaS for your own hardware. Point it at an image or a git repo, fill in the
				form, hit deploy. Traefik puts it on <code>slug.yourdomain.com</code> with TLS. No
				Kubernetes. No control plane. No pricing page.
			</p>
			<div class="mt-6.5 flex flex-wrap gap-2.5">
				<a class="btn btn-primary" href={resolve("/homerun/docs")}>Read the docs</a>
				<a class="btn" href="#showcase">Screenshots</a>
				<a class="btn" href="https://github.com/orochibraru/homerun" target="_blank" rel="noopener"
					>Source on GitHub</a
				>
				<a class="btn" href={resolve("/homerun/docs/faq-and-limitations")}
					>FAQ &amp; limitations</a
				>
			</div>
		</div>
		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Why it exists</h2>
			<p>
				Coolify carries a lot of tech debt and a matching pile of bugs. Dokploy started moving
				features homelabbers relied on behind an enterprise plan. Both are fine projects; neither is
				what I wanted running on my one box at home.
			</p>
			<p class="mt-5">
				So Homerun is deliberately small:
				<strong>one host, the local Docker socket, one user.</strong>
				No multi-node orchestration to babysit, no cluster to explain to yourself at 3am. Everything
				it does, it does for free.
			</p>
		</section>

		<section id="showcase" class="mb-22.5">
			<div class="mb-7 flex items-baseline gap-4">
				<h2 class="text-2xl font-bold tracking-[-.02em]">Showcase</h2>
				<div class="h-px flex-1 bg-line"></div>
			</div>
			<p class="mb-7">
				None of these are mockups. Playwright drives a real instance from a blank database &mdash; a
				real sign-up, the first-run wizard, then a stack with three services, two of them actually
				deployed as containers on the host&rsquo;s Docker socket. If a screen stops rendering the
				run fails instead of publishing it. Light or dark follows your system; both are the real
				thing.
			</p>
			<div class="grid gap-px border border-line bg-line sm:grid-cols-2">
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={heroDark}>
						<img
							src={hero}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="The Homerun dashboard, showing service counts and live host resources"
						>
					</picture>
					<figcaption>
						<b>The dashboard</b>
						Service counts, live host CPU, memory and disk (plus GPU if there&rsquo;s an NVIDIA
						card), per-service usage, the deploys that just ran, and a banner for any setup issue
						that links straight to the field it&rsquo;s complaining about.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={serviceDark}>
						<img
							src={service}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="A service overview page with its status, hostname and live log tail"
						>
					</picture>
					<figcaption>
						<b>A service</b>
						Status, the hostname Traefik routes to it, and a tab each for source, revisions,
						observability, env vars, volumes, networking, compute and a web terminal.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={deployDark}>
						<img
							src={deploy}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="The four-step deploy wizard, on the basic info step"
						>
					</picture>
					<figcaption>
						<b>Deploying something new</b>
						Four steps &mdash; basic info, networking, environment, compute &mdash; from a Docker
						image or straight from a git repo&rsquo;s Dockerfile.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={templatesDark}>
						<img
							src={templates}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="The template gallery, showing built-in app cards with their logos"
						>
					</picture>
					<figcaption>
						<b>Templates</b>
						Around 58 common self-hosted apps with their real logos bundled in, searchable and
						filtered by category. Quick Deploy skips the wizard entirely; Configure pre-fills it.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={logsDark}>
						<img
							src={logs}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="A service&rsquo;s observability tab: uptime checks above a live log stream"
						>
					</picture>
					<figcaption>
						<b>Logs and uptime</b> <code>stdout</code>/<code>stderr</code>
						streamed from the container as it runs, ANSI colours intact, under uptime probes from
						the network and from its own hostname.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={stackDark}>
						<img
							src={stack}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="A stack page grouping three services with their resource usage"
						>
					</picture>
					<figcaption>
						<b>Stacks</b>
						A stack puts its services on a shared Docker network, so they reach each other by slug
						(<code>http://cache:6379</code>) without going back out through Traefik.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={networkingDark}>
						<img
							src={networking}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="A service&rsquo;s networking tab, showing its public hostname and custom domain"
						>
					</picture>
					<figcaption>
						<b>Domains and access</b>
						The hostname Traefik routes to the service, a second custom domain beside it, and a
						switch that puts a Homerun login in front of the app. These are Traefik labels, so the
						tab says plainly that changing them needs a redeploy.
					</figcaption>
				</figure>
				<figure class="shot">
					<picture>
						<source media="(prefers-color-scheme: dark)" srcset={settingsDark}>
						<img
							src={settings}
							width="1200"
							height="675"
							loading="lazy"
							decoding="async"
							alt="The instance settings page, on the General tab"
						>
					</picture>
					<figcaption>
						<b>Settings, not files</b>
						Base domain, Docker, Traefik, DNS automation and SMTP are stored in the database and
						applied live. Each field shows the env var behind it as its placeholder.
					</figcaption>
				</figure>
			</div>
			<p class="mt-7">
				Env vars, compute limits, revisions, users and signing in are in the
				<a href={resolve("/homerun/docs/showcase")}>full showcase</a>, all of it
				generated the same way.
			</p>
		</section>

		<section class="mb-22.5">
			<div class="mb-7 flex items-baseline gap-4">
				<h2 class="text-2xl font-bold tracking-[-.02em]">Features</h2>
				<div class="h-px flex-1 bg-line"></div>
			</div>
			<div class="grid gap-px border border-line bg-line sm:grid-cols-2">
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Image or git deploys</h3>
					<p>
						Any Docker image, or build from a git repo&rsquo;s Dockerfile. Env vars, CPU/memory
						limits, restart policy, private registry auth.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Your git host, connected</h3>
					<p>
						An admin registers an OAuth app once for GitHub, GitLab, self-hosted Gitea or Bitbucket;
						everyone else connects their own account and picks a repo and branch from a list.
						Private repos without a token in the clone URL, and the branch is checked for a
						<code>Dockerfile</code>
						before you commit to it.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Live deploy progress</h3>
					<p>
						Pull, build, create and start streamed to the browser in real time, and it resumes
						correctly if you reload mid-deploy.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Deployment history</h3>
					<p>Every attempt recorded with status, image digest and its full log.</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Stacks</h3>
					<p>
						Group services on one Docker network so they reach each other by slug, like
						<code>http://api:8080</code>.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">A template catalog</h3>
					<p>
						Around 58 built-in apps &mdash; Jellyfin, the *arr stack, Postgres, Redis, Pi-hole,
						Grafana, Vaultwarden, Excalidraw and the rest &mdash; each with its real logo bundled
						in, so the gallery renders with no outbound internet. Quick Deploy skips the wizard; a
						details page pulls the repo&rsquo;s README, stars and latest release from GitHub. Save
						any service of your own as a template too.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Linked containers</h3>
					<p>
						A template can bring its companions along: WordPress ships linked to MySQL, Umami to
						Postgres. <code>{"{{db}}"}</code> resolves to the companion&rsquo;s hostname and
						<code>{"{{db.POSTGRES_PASSWORD}}"}</code>
						to its own value, so the two agree on a password you never typed.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Compose import</h3>
					<p>
						Paste a <code>docker-compose.yaml</code> and get services, volumes and dependency order,
						with a preview of whatever doesn&rsquo;t map.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Smart service links</h3>
					<p>
						Point a new service at an existing Postgres, MySQL, Redis, Mongo or RabbitMQ and the
						connection URL fills itself in.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Logs &amp; web terminal</h3>
					<p>
						Tail stdout/stderr or open an interactive shell into a running container, from the
						browser, with uptime probes from the network and from the service&rsquo;s own hostname
						beside them.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Domains &amp; SSL</h3>
					<p>
						A second hostname per service, plus bring-your-own cert and key for domains outside
						Traefik&rsquo;s ACME coverage.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Build servers &amp; cache</h3>
					<p>
						Build on another Docker daemon over <code>tcp://</code> or <code>ssh://</code>, or via
						the lightweight Homerun Agent. Point a build at a registry credential and it pulls the
						last image as a layer cache and pushes the fresh layers back, so a repeat build
						doesn&rsquo;t start cold.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Swarm mode</h3>
					<p>
						Opt in to Docker Swarm for real replica scaling and load balancing, instead of the
						default single-container model.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Storage volumes</h3>
					<p>
						Define bind-mounts or Docker-managed volumes once, mount them into as many services as
						you like.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						Scheduled jobs &amp; S3 backups
					</h3>
					<p>
						Cron-style auto-redeploy per service, standalone cron jobs with their own run history,
						and scheduled volume backups to a named S3 destination &mdash; defined once, pointed at
						from as many volumes as you like. AWS, MinIO, R2, B2, Wasabi.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">One Scheduling page</h3>
					<p>
						Every cron redeploy, cron job and backup schedule on the instance in one read-only view,
						with the job queue underneath it: what&rsquo;s running now, what&rsquo;s waiting, and
						how the last handful finished.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Backup history</h3>
					<p>
						One row per attempt across every volume, scheduled or manual, with the uploaded size and
						the error if it failed. Searchable, filterable by outcome, and paged all the way back.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						REST API, OpenAPI &amp; a CLI
					</h3>
					<p>
						Everything the UI does is a typed JSON API at <code>/api/v1</code>, with live Swagger UI
						and a <code>homerun</code> CLI built against the generated types.
						<code>homerun login</code>
						is a device-code flow &mdash; approve it in the browser and the binary keeps its own API
						key &mdash; and <code>homerun update</code>
						replaces itself.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Users, roles &amp; invites</h3>
					<p>
						Admin and developer roles, email or direct-create invites, and optional OAuth/OIDC
						login. Each account gets its own sessions list, revocable one by one, and its own API
						keys.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Per-service auth gate</h3>
					<p>
						Optionally require a Homerun login to reach a deployed service. Every container is
						labelled <code>homerun.managed=true</code>, so it never touches anything it didn&rsquo;t
						create.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">DNS automation</h3>
					<p>
						Optional Cloudflare or self-hosted Pangolin integration manages a deployed
						service&rsquo;s DNS record for you.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Docker cleanup</h3>
					<p>
						Admin-only host-wide <code>docker system df</code> and prune from the dashboard, with a
						preview before anything is removed.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						Search, filters &amp; bulk actions
					</h3>
					<p>
						Server-side search, filters and paging on every list page, plus multi-select
						start/stop/restart/delete with a typed confirmation before anything destructive runs.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						Host metrics &amp; self-diagnostics
					</h3>
					<p>
						Live CPU, memory, disk and &mdash; with an NVIDIA card present &mdash; GPU usage for the
						host, alongside per-service CPU, memory and traffic. Read-only checks run on every
						dashboard load and any that fail become a banner that deep-links into the offending
						settings field.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">System logs</h3>
					<p>
						Traefik&rsquo;s own output streamed live, which is where a 404 on a service that
						deployed fine, or a certificate that won&rsquo;t issue, actually shows up. Admins can
						restart or update the Traefik container from the same panel, without touching the
						compose file.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Errors that stick around</h3>
					<p>
						Anything Homerun logs at warn or error level about one of your services is persisted and
						shown on that service, and the newest few sit on the dashboard. A container&rsquo;s own
						scrollback is no longer the only record of what went wrong.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Notifications</h3>
					<p>
						A per-account bell for deploy succeeded or failed, service created, started or stopped,
						an auto-redeploy firing, and runtime errors attributed to one of your services. Click
						through to the service it happened to.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						Configured from the dashboard
					</h3>
					<p>
						A five-step first-run wizard, then <code>/settings</code> for the rest, stored in the
						database and applied live with no restart. Three env vars genuinely can&rsquo;t live
						there &mdash; the database URL, <code>AUTH_SECRET</code> and
						<code>ORIGIN</code>
						&mdash; and the installer writes all three. A
						<code>homerun.yaml</code>
						exists if you&rsquo;d rather keep config as code, and is entirely optional.
					</p>
				</div>
			</div>
		</section>

		<section id="alternatives" class="mb-22.5">
			<div class="mb-7 flex items-baseline gap-4">
				<h2 class="text-2xl font-bold tracking-[-.02em]">An alternative to what, exactly</h2>
				<div class="h-px flex-1 bg-line"></div>
			</div>
			<p class="mb-7">
				People arrive here from a specific frustration, usually a bill or a bug. So here is where
				Homerun sits against the things it gets compared to, including where it loses.
			</p>
			<div class="grid gap-px border border-line bg-line sm:grid-cols-2">
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Dokploy alternative</h3>
					<p>
						Dokploy started moving features homelabbers relied on behind an enterprise plan. Homerun
						has no plan to move anything behind: remote build servers, S3 backups, roles and
						invites, the API and the CLI all ship in the one image.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Coolify alternative</h3>
					<p>
						Coolify does far more than this &mdash; and carries the tech debt and bug count of doing
						far more than this. Homerun is deliberately one host, one Docker socket, a small surface
						you can actually read.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						Dokku &amp; CapRover alternative
					</h3>
					<p>
						Dokku is a git push and an SSH session; CapRover is captain-definition files. Homerun is
						a form in a browser with live build logs, a compose importer and a web terminal, on the
						same one box.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Google Cloud Run alternative</h3>
					<p>
						Container in, URL with TLS out, which is the part of Cloud Run most people actually use.
						No scale-to-zero, no regions, no per-request billing, no console with nine nested menus.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">AWS alternative</h3>
					<p>
						If ECS, App Runner or Elastic Beanstalk is running three side projects and an invoice
						you don&rsquo;t read, this replaces it with one machine you own. If you need IAM,
						autoscaling groups and multi-region failover, it very much does not.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
						Heroku, Render, Railway &amp; Fly.io alternative
					</h3>
					<p>
						The same deploy-a-repo ergonomics, minus the seat pricing, the sleeping dynos and the
						usage meter. Your build time costs electricity, not credits.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Portainer alternative</h3>
					<p>
						Portainer manages containers that already exist. Homerun builds them, routes them, gives
						them TLS certificates and redeploys them on a schedule &mdash; and labels everything
						<code>homerun.managed=true</code>
						so it never touches what it didn&rsquo;t create.
					</p>
				</div>
				<div class="feat">
					<h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Kubernetes alternative</h3>
					<p>
						No control plane, no YAML dialect, no 3am cluster archaeology. Opt into Docker Swarm if
						you want real replica scaling; otherwise it is one container per service and that is the
						whole model.
					</p>
				</div>
			</div>
			<p class="mt-7 text-[.85rem]">
				Since we&rsquo;re being honest about search: people get here looking for a
				<em>Dokploy alternative</em>, <em>Coolify alternative</em>, <em>Dokku alternative</em>,
				<em>CapRover alternative</em>, <em>Cloud Run alternative</em>,
				<em>Google Cloud alternative</em>, <em>AWS alternative</em>,
				<em>Heroku alternative</em>, <em>Vercel alternative</em>, <em>Netlify alternative</em>,
				<em>Render alternative</em>, <em>Railway alternative</em>, <em>Fly.io alternative</em>,
				<em>DigitalOcean App Platform alternative</em>, <em>Easypanel alternative</em>,
				<em>Portainer alternative</em>
				or a <em>Kubernetes alternative</em> for one box. That is the list. It is a self-hosted
				PaaS, and it is free.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Run it</h2>
			<p class="mb-3 text-xs uppercase tracking-widest text-dim">One-liner, fresh Linux server</p>
			<pre
			>curl -fsSL https://raw.githubusercontent.com/orochibraru/homerun/main/packages/installer/bootstrap.sh \
  | sudo bash -s -- --mode=full --domain=homerun.example.com</pre>
			<p class="mt-5">
				That installs Docker Engine, sets up a dedicated <strong>rootless</strong> Docker user so
				nothing it deploys runs as root, writes a compose file, and brings up Traefik, Postgres and
				the app from published images. Pass <code>--dry-run</code> first on a box that matters. Use
				<code>--mode=agent</code>
				if this host is only going to be a remote build server for another instance.
			</p>
			<p class="mt-8 mb-3 text-xs uppercase tracking-widest text-dim">Docker Compose</p>
			<pre><span class="c"># already have Docker set up your way? just take the stack</span>
curl -fsSLO https://raw.githubusercontent.com/orochibraru/homerun/main/compose.prod.yaml
curl -fsSLO https://raw.githubusercontent.com/orochibraru/homerun/main/.env.example
curl -fsSL https://raw.githubusercontent.com/orochibraru/homerun/main/homerun.example.yaml -o homerun.yaml

mv .env.example .env    <span class="c"># set AUTH_SECRET at minimum</span>
docker network create homerun
docker compose -f compose.prod.yaml up -d</pre>
			<p class="mt-5">
				<code>compose.prod.yaml</code>
				is self-contained and pulls Traefik, Postgres and the app from published images. No
				installer, no rootless setup, no source checkout. Set
				<code>ORIGIN</code>
				to the address you will actually reach the dashboard at: it is never
				<code>localhost</code>, or the first sign-up fails with an invalid origin from any browser
				that is not on the box.
			</p>
			<p class="mt-5">
				Either way, that is the last file you touch. The first sign-in drops you into a five-step
				wizard, and after that the base domain, Docker, Traefik, email, sign-in methods and DNS
				automation are all pages in the dashboard, stored in the database and applied live. Both
				paths are covered properly in the
				<a href={resolve("/homerun/docs/getting-started")}>getting started guide</a>.
			</p>
		</section>

		<section class="mb-22.5">
			<h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Status</h2>
			<p>
				Actively developed and running on real hardware, but still finding its shape. What&rsquo;s
				solid and what isn&rsquo;t is written down honestly in
				<a href={resolve("/homerun/docs/faq-and-limitations")}
					>the FAQ and limitations doc</a
				>. Read it before you point production at it.
			</p>
		</section>
	</article>
</main>
