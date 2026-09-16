<script lang="ts">
import "../app.css";
import { page } from "$app/state";
import Footer from "$lib/components/Footer.svelte";
import Header from "$lib/components/Header.svelte";
import Search from "$lib/components/Search.svelte";
import { REPOSITORIES } from "$lib/site";

let { children } = $props();

let search = $state<Search>();

const segment = $derived(page.url.pathname.split("/")[1] ?? "");
const width = $derived(
	page.route.id?.startsWith("/[project=project]/docs") ? "max-w-[110rem]" : "max-w-page",
);
const source = $derived(
	REPOSITORIES.has(segment) ? `https://github.com/orochibraru/${segment}` : undefined,
);
</script>

<Header {width} {source} onsearch={() => search?.open()} />
{@render children()}
<Footer {width} />
<Search bind:this={search} />
