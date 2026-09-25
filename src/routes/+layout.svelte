<script lang="ts">
	import "../app.css";
	import { browser } from "$app/env";
	import { onNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import Footer from "$lib/components/Footer.svelte";
	import Header from "$lib/components/Header.svelte";
	import Search from "$lib/components/Search.svelte";
	import TopLoadingBar from "$lib/components/top-loading-bar.svelte";

	let { children } = $props();

	let search = $state<Search>();

	const admin = $derived(page.route.id?.startsWith("/admin") ?? false);
	const docs = $derived(page.route.id?.startsWith("/[repo]/[[channel=channel]]/docs") ?? false);
	const width = $derived(docs ? "max-w-none" : "max-w-page");
	// project pages and their docs hand their repo over as page data
	const source = $derived(
		typeof page.data.source === "string" ? (page.data.source as string) : undefined,
	);

	// feeds the card spotlight in app.css: one listener for every card on every page
	function spotlight(event: PointerEvent) {
		const card = (event.target as Element | null)?.closest?.<HTMLElement>(".card");
		if (!card) {
			return;
		}
		const box = card.getBoundingClientRect();
		card.style.setProperty("--x", `${event.clientX - box.left}px`);
		card.style.setProperty("--y", `${event.clientY - box.top}px`);
	}

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

<svelte:window onpointermove={spotlight} />

<TopLoadingBar />
{#if admin}
  <!-- the admin brings its own chrome and its own ⌘K -->
  {@render children()}
{:else}
  <!-- docs render a fixed lg:w-72 sidebar, so everything else shifts right of it -->
  <div class={docs ? "lg:pl-72" : undefined}>
    <Header {width} {source} {docs} onsearch={() => search?.open()} />
    {@render children()}
    <Footer {width} />
  </div>
  <Search bind:this={search} />
{/if}
