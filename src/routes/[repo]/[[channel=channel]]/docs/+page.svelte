<script lang="ts">
	import { ArrowRight, ArrowUpRight } from "@lucide/svelte";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import LucideIcon from "$lib/components/LucideIcon.svelte";
	import Meta from "$lib/components/Meta.svelte";
	import { docsUrl } from "$lib/projects";
	import { clip, PERSON, SITE, WEBSITE } from "$lib/seo";

	let { data } = $props();
	const project = $derived(data.project);
	const path = $derived(docsUrl(project));
	const description = $derived(`Every guide for ${project.name}: ${project.blurb}`);
	// cards cycle through the three brand accents; full class strings so Tailwind sees them
	const TINTS = [
		{ icon: "bg-accent/10 text-accent ring-accent/20", card: "hover:border-accent/50" },
		{ icon: "bg-cool/10 text-cool ring-cool/20", card: "hover:border-cool/50" },
		{ icon: "bg-hot/10 text-hot ring-hot/20", card: "hover:border-hot/50" },
	] as const;
	const slugOf = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	const start = $derived(
		data.guides.find((guide) => guide.slug === "getting-started") ?? data.guides[0],
	);
</script>

<Meta
  title="{project.name} documentation"
  {description}
  {path}
  noindex={project.channel !== "latest"}
  trail={[
    [project.name, `/${project.key}`],
    ["Docs", path],
  ]}
  structuredData={[
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${SITE}${path}#docs`,
      name: `${project.name} documentation`,
      url: `${SITE}${path}`,
      description,
      inLanguage: "en",
      isPartOf: WEBSITE,
      author: PERSON,
      publisher: PERSON,
      about: { "@type": "SoftwareApplication", name: project.name, url: `${SITE}/${project.key}` },
      hasPart: data.guides.map((guide) => ({
        "@type": "TechArticle",
        headline: guide.title,
        description: clip(guide.intro, 180),
        url: `${SITE}${guide.url}`,
        author: PERSON,
      })),
    },
  ]}
/>

<main class="px-6 lg:px-10">
  <div class="mx-auto pt-12 pb-24">
    <header class="max-w-3xl">
      <p
        class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-sans text-xs text-dim"
      >
        <span class="size-1.5 rounded-full bg-hot shadow-[0_0_8px_var(--color-hot)]"></span>
        {data.guides.length} guides &middot;
        {#if data.versions.length > 1 && project.channel === "latest"}
          the {project.branch} release
        {:else}
          synced daily from GitHub
        {/if}
      </p>
      <h1 class="mt-5 text-[clamp(2.2rem,4.5vw,2.9rem)]/[1.05] animate-rise stereo font-extrabold tracking-[-.035em]">
        {project.name}
        <span class="grad"
          >docs</span
        >
      </h1>
      <p class="mt-4 font-sans text-lg/relaxed text-fg/70">{project.blurb}</p>
      <div class="mt-7 flex flex-wrap gap-3 font-sans text-sm font-medium">
        {#if start}
          <a
            class="group inline-flex items-center gap-2 rounded-lg bg-spark px-4 py-2.5 font-semibold text-onspark shadow-[0_8px_24px_-10px_var(--color-spark)] transition hover:brightness-105"
            href={resolve("/[repo]/[[channel=channel]]/docs/[slug]", {
              channel: page.params.channel,
              repo: project.key,
              slug: start.slug,
            })}
            >Get started<ArrowRight
              class="size-4 transition group-hover:translate-x-0.5"
              aria-hidden="true"
            /></a
          >
        {/if}
        <a
          class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 transition hover:border-edge"
          href="{project.repo}/tree/{project.branch}/docs"
          target="_blank"
          rel="noopener"
          >Markdown source<ArrowUpRight class="size-4 text-dim" aria-hidden="true" /></a
        >
      </div>
    </header>

    {#each data.categories as category, index (index)}
      <!-- the README/CONTRIBUTING group has no title: its cards lead with no heading -->
      <section
        class="mt-14"
        aria-labelledby={category.title ? `category-${slugOf(category.title)}` : undefined}
        aria-label={category.title ? undefined : "Start here"}
      >
        {#if category.title}
          <div class="mb-5 flex items-center gap-3">
            {#if category.icon}
              <LucideIcon node={category.icon} class="size-5 text-accent" aria-hidden="true" />
            {/if}
            <h2 id="category-{slugOf(category.title)}" class="text-xl font-bold tracking-[-.02em]">
              {category.title}
            </h2>
          </div>
          {#if category.description}
            <p class="-mt-3.5 mb-5 font-sans text-sm text-dim">{category.description}</p>
          {/if}
        {/if}
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {#each data.guides.filter((guide) => category.slugs.includes(guide.slug)) as guide, index (guide.slug)}
            {@const tint = TINTS[index % TINTS.length] ?? TINTS[0]}
            <a
              class="group relative flex flex-col glass rounded-3xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)] {tint.card}"
              href={resolve("/[repo]/[[channel=channel]]/docs/[slug]", {
              channel: page.params.channel,
                repo: project.key,
                slug: guide.slug,
              })}
            >
              <span
                class="grid size-9 place-items-center rounded-lg ring-1 transition group-hover:scale-105 {tint.icon}"
                ><LucideIcon node={guide.icon} class="size-4.5" aria-hidden="true" /></span
              >
              <ArrowUpRight
                class="absolute top-5 right-5 size-4 text-dim opacity-0 transition group-hover:opacity-100"
                aria-hidden="true"
              />
              <h3 class="mt-4 text-base font-bold tracking-[-.02em]">{guide.label}</h3>
              <p class="mt-1.5 line-clamp-2 font-sans text-sm/6 text-dim">{guide.intro}</p>
            </a>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</main>
