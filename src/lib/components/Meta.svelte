<script lang="ts">
import { breadcrumbs, jsonld, mdPath, SITE } from "$lib/seo";

type Image = { url: string; width: number; height: number; alt: string };

let {
	title,
	description,
	path,
	ogType = "website",
	image,
	trail,
	structuredData = [],
	twin = true,
	noindex = false,
}: {
	title: string;
	description: string;
	path: string;
	ogType?: string;
	image?: Image;
	trail?: [string, string][];
	structuredData?: unknown[];
	twin?: boolean;
	noindex?: boolean;
} = $props();

// A page without a real wide screenshot gets the square avatar, and the small card is the honest one for it.
const card = $derived(
	image ?? { url: `${SITE}/avatar.jpg`, width: 320, height: 320, alt: "orochibraru" },
);
const nodes = $derived(trail ? [...structuredData, breadcrumbs(trail)] : structuredData);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description}>
	{#if noindex}
		<meta name="robots" content="noindex">
	{:else}
		<link rel="canonical" href="{SITE}{path}">
	{/if}
	<meta property="og:type" content={ogType}>
	<meta property="og:url" content="{SITE}{path}">
	<meta property="og:title" content={title}>
	<meta property="og:description" content={description}>
	<meta property="og:image" content={card.url}>
	<meta property="og:image:width" content={String(card.width)}>
	<meta property="og:image:height" content={String(card.height)}>
	<meta property="og:image:alt" content={card.alt}>
	<meta name="twitter:card" content={image ? "summary_large_image" : "summary"}>
	<meta name="twitter:image" content={card.url}>
	{#if twin}
		<link rel="alternate" type="text/markdown" href={mdPath(path)}>
	{/if}
	{#if nodes.length}
		{@html jsonld(...nodes)}
	{/if}
</svelte:head>
