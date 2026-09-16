<script lang="ts">
	import "../app.css";
	import { browser } from "$app/env";
	import { onNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import Footer from "$lib/components/Footer.svelte";
	import Header from "$lib/components/Header.svelte";
	import Search from "$lib/components/Search.svelte";
	import TopLoadingBar from "$lib/components/top-loading-bar.svelte";
	import { REPOSITORIES } from "$lib/site";

	let { children } = $props();

	let search = $state<Search>();

	const segment = $derived(page.url.pathname.split("/")[1] ?? "");
	const docs = $derived(page.route.id?.startsWith("/[project=project]/docs") ?? false);
	const width = $derived(docs ? "max-w-none" : "max-w-page");
	const source = $derived(
		REPOSITORIES.has(segment) ? `https://github.com/orochibraru/${segment}` : undefined,
	);

	onNavigate((navigation) => {
		if (!browser) {
			return;
		}

		if (!document.startViewTransition) {
			return;
		}

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<TopLoadingBar />
<!-- docs render a fixed lg:w-72 sidebar, so everything else shifts right of it -->
<div class={docs ? "lg:pl-72" : undefined}>
  <Header {width} {source} {docs} onsearch={() => search?.open()} />
  {@render children()}
  <Footer {width} />
</div>
<Search bind:this={search} />
