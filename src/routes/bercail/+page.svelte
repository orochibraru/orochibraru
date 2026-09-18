<script lang="ts">
	import { BookOpen } from "@lucide/svelte";
	import { resolve } from "$app/paths";
	import dashboard from "$docs/bercail/images/dashboard.webp";
	import dashboardDark from "$docs/bercail/images/dashboard-dark.webp";
	import BrandIcon from "$lib/components/BrandIcon.svelte";
	import Meta from "$lib/components/Meta.svelte";
	import { SITE } from "$lib/seo";

	let { data } = $props();

	const structuredData = [
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: "Bercail",
			applicationCategory: "UtilitiesApplication",
			operatingSystem: "Linux, macOS, Docker",
			description:
				"Bercail is a free, open-source, self-hosted start page for your homelab, and a Homepage, Homarr, Dashy, Homer and Heimdall alternative: your links with live online status, weather, host vitals, Umami analytics and a new tab extension.",
			url: "https://orochibraru.com/bercail",
			screenshot: `${SITE}${dashboardDark}`,
			keywords:
				"Homepage alternative, Homarr alternative, Dashy alternative, Homer alternative, Heimdall alternative, Flame alternative, start.me alternative, self-hosted start page, homelab dashboard",
			isAccessibleForFree: true,
			codeRepository: "https://github.com/orochibraru/bercail",
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
  title="Bercail: a free self-hosted homelab start page, and a Homepage and Homarr alternative"
  description="Bercail is a free, open-source, self-hosted start page for your homelab, and a Homepage, Homarr, Dashy, Homer and Heimdall alternative: your links with live online status, weather, host vitals, Umami analytics and a new tab extension."
  path="/bercail"
  image={{ url: `${SITE}${dashboardDark}`, width: 1200, height: 1095, alt: "The Bercail dashboard" }}
  trail={[["Bercail", "/bercail"]]}
  {structuredData}
/>

<main class="mx-auto max-w-page px-6">
  <article class="prose">
    <div class="pt-10 pb-5">
      <a
        class="text-xs uppercase tracking-widest text-dim hover:text-acid"
        href={resolve("/#projects")}>&larr; All projects</a
      >
      <span class="tag ml-3.5">Dashboard &middot; Self-hosted</span>
      <h1 class="mt-4.5 text-[clamp(2.4rem,8vw,4.6rem)]/none font-extrabold tracking-[-.03em]">
        Bercail
      </h1>
      <p class="mt-6 max-w-[72ch] text-[1.15rem] text-dim">
        A start page for your homelab. The weather and your server&rsquo;s vitals at the top, your
        links below, each with a dot that tells you whether it&rsquo;s up before you click it.
      </p>
      <div class="mt-6.5 flex flex-wrap gap-2.5">
        <a class="btn btn-primary" href={resolve("/bercail/docs")}>
          <BookOpen size={15} />Read the docs
        </a>
        <a
          class="btn"
          href="https://github.com/orochibraru/bercail"
          target="_blank"
          rel="noopener"
        >
          <BrandIcon name="github" />Source on GitHub
        </a>
        <a
          class="btn"
          href="https://hub.docker.com/r/orochibraru/bercail"
          target="_blank"
          rel="noopener"
        >
          <BrandIcon name="docker" />Docker Hub
        </a>
      </div>
    </div>

    <figure class="shot mb-22.5 border border-line">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset={dashboardDark}>
        <img
          src={dashboard}
          width="1200"
          height="1095"
          decoding="async"
          alt="The Bercail dashboard: weather, host gauges and analytics on top, groups of links below"
        >
      </picture>
      <figcaption>
        <b>The dashboard</b>
        Weather and the host&rsquo;s vitals on top, links underneath, each with its status dot.
        Straight out of the repo&rsquo;s Playwright run, in whichever theme your system uses.
      </figcaption>
    </figure>

    <section class="mb-22.5">
      <div class="mb-7 flex items-baseline gap-4">
        <h2 class="text-2xl font-bold tracking-[-.02em]">Your links</h2>
        <div class="h-px flex-1 bg-line"></div>
      </div>
      <div class="grid gap-px border border-line bg-line sm:grid-cols-2">
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Links in groups</h3>
          <p>
            Title, description, URL, same or new tab, and an icon: an image URL or any name from
            <a href="https://dashboardicons.com/icons" target="_blank" rel="noopener"
              >Dashboard Icons</a
            >. Drag one by its grip to reorder it or move it to another group.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Online status</h3>
          <p>
            The server sends a <code>HEAD</code> to every link, 5 second timeout, cached for 30
            seconds. Anything below a 500 counts as up. Self-signed certificates are fine.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Search</h3>
          <p><code>&#8984;K</code> / <code>Ctrl+K</code> to jump to any link or search the web.</p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Backup and restore</h3>
          <p>Export your groups and links to JSON from Settings, and import them back.</p>
        </div>
      </div>
    </section>

    <section class="mb-22.5">
      <div class="mb-7 flex items-baseline gap-4">
        <h2 class="text-2xl font-bold tracking-[-.02em]">At a glance</h2>
        <div class="h-px flex-1 bg-line"></div>
      </div>
      <div class="grid gap-px border border-line bg-line sm:grid-cols-2">
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">System stats</h3>
          <p>
            CPU, RAM, disk, temperature and GPU gauges for the host it runs on, refreshed every 5
            seconds. A metric it can&rsquo;t read shows <code>N/A</code> and leaves the rest alone.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Weather</h3>
          <p>
            Current conditions and a 5-day forecast from
            <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>. No API
            key.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Analytics</h3>
          <p>
            Live visitors, plus visitors and pageviews per website over 24 hours, 7, 30, 365 days and
            all time, from your own
            <a href="https://umami.is/" target="_blank" rel="noopener">Umami</a> v3 instance.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Themes</h3>
          <p>Light, dark or system.</p>
        </div>
      </div>
    </section>

    <section class="mb-22.5">
      <div class="mb-7 flex items-baseline gap-4">
        <h2 class="text-2xl font-bold tracking-[-.02em]">Every new tab</h2>
        <div class="h-px flex-1 bg-line"></div>
      </div>
      <p>
        A Chrome extension puts your Bercail on every new tab. Grab
        <code>bercail-extension.zip</code>
        from the latest release, load it unpacked, point it at your instance. After the first visit
        the page comes out of a service worker cache, so a new tab doesn&rsquo;t wait on the server.
      </p>
    </section>

    <section id="alternatives" class="mb-22.5">
      <div class="mb-7 flex items-baseline gap-4">
        <h2 class="text-2xl font-bold tracking-[-.02em]">An alternative to what, exactly</h2>
        <div class="h-px flex-1 bg-line"></div>
      </div>
      <p class="mb-7">
        Homelab start pages are a crowded shelf. Here is where Bercail sits on it, including where it
        loses.
      </p>
      <div class="grid gap-px border border-line bg-line sm:grid-cols-2">
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Homepage alternative</h3>
          <p>
            Homepage is configured in YAML and talks to more services than anyone runs. Bercail is
            edited in the page itself and ships a handful of widgets. If you want a tile for every
            *arr in your stack, keep Homepage.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Homarr &amp; Dashy alternative</h3>
          <p>
            Both do everything, and have the settings screens to prove it. Bercail is links, status,
            weather, vitals and analytics, in one container with one SQLite file.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">Homer alternative</h3>
          <p>
            Homer is a static page, so anything live happens in your browser, where CORS and
            self-signed certificates get in the way. Bercail checks your links from the server, and
            doesn&rsquo;t mind either.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">
            Heimdall &amp; Flame alternative
          </h3>
          <p>
            The same idea &mdash; a tidy grid of your apps &mdash; with an up/down dot on every link, a
            <code>&#8984;K</code> palette, and your server&rsquo;s gauges above them.
          </p>
        </div>
        <div class="feat">
          <h3 class="mb-1.5 text-base font-bold tracking-[-.01em]">start.me &amp; Momentum alternative</h3>
          <p>
            A new tab page without an account on someone else&rsquo;s server. The extension opens your
            own instance, and it can see the machines on your LAN, which theirs can&rsquo;t.
          </p>
        </div>
      </div>
    </section>

    <section class="mb-22.5">
      <h2 class="mb-5 text-2xl font-bold tracking-[-.02em]">Run it</h2>
      <p class="mb-3 text-xs uppercase tracking-widest text-dim">Docker Compose</p>
      {@html data.compose}
      <p class="mt-5">
        <strong>One container, one volume.</strong>
        Everything lives in a SQLite file under <code>/app/data</code>, and migrations run on
        startup. Images are published for <code>linux/amd64</code> and <code>linux/arm64</code>.
        Every setting is optional; set <code>ORIGIN</code> to the URL you browse to, or forms fail
        behind a reverse proxy.
      </p>
      <p class="mt-5">
        Without <code>OIDC_ISSUER</code> it&rsquo;s open to anyone who can reach it. Set it, with a
        client ID and secret, and every page asks for sign-in through your provider: Pocket ID,
        Authentik, Authelia, Keycloak. <code>OIDC_ALLOWED_EMAILS</code> narrows who gets in &mdash;
        set it unless your provider already does.
      </p>
    </section>
  </article>
</main>
