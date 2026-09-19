<script lang="ts">
	import "@milkdown/crepe/theme/common/style.css";
	import "@milkdown/crepe/theme/frame.css";

	let {
		value = $bindable(""),
		name,
		conventions = false,
		images = {},
	}: {
		value?: string;
		/** The form field the Markdown is posted as. */
		name: string;
		/** Offer the project-page blocks (feature tile, screenshot) in the slash menu. */
		conventions?: boolean;
		/** Screenshot names to their URLs, so ![alt](hero) shows the real image while editing. */
		images?: Record<string, string>;
	} = $props();

	const TILE_ICON =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
	const SHOT_ICON =
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/></svg>';

	async function upload(file: File): Promise<string> {
		const body = new FormData();
		body.append("file", file);
		const response = await fetch("/admin/images/upload", { method: "POST", body });
		if (!response.ok) {
			throw new Error(await response.text());
		}
		return ((await response.json()) as { url: string }).url;
	}

	// Crepe only exists in the browser: it is built when the element mounts and
	// torn down with it. The initial value is read once; after that the editor owns it.
	function crepe(node: HTMLElement) {
		let destroy: (() => void) | undefined;
		let cancelled = false;
		(async () => {
			const [
				{ Crepe, CrepeFeature },
				{ commandsCtx, remarkStringifyOptionsCtx },
				{ insert },
				{ clearTextInCurrentBlockCommand },
			] = await Promise.all([
				import("@milkdown/crepe"),
				import("@milkdown/kit/core"),
				import("@milkdown/kit/utils"),
				import("@milkdown/kit/preset/commonmark"),
			]);
			if (cancelled) {
				return;
			}
			const block = (markdown: string) => (ctx: Parameters<ReturnType<typeof insert>>[0]) => {
				ctx.get(commandsCtx).call(clearTextInCurrentBlockCommand.key);
				insert(markdown)(ctx);
			};
			const editor = new Crepe({
				root: node,
				defaultValue: value,
				featureConfigs: {
					[CrepeFeature.ImageBlock]: {
						onUpload: upload,
						// display only: the Markdown keeps the name
						proxyDomURL: (url: string) => images[url] ?? url,
					},
					[CrepeFeature.BlockEdit]: conventions
						? {
								buildMenu: (builder) => {
									builder
										.addGroup("site", "This site")
										.addItem("feature-tile", {
											label: "Feature tile",
											icon: TILE_ICON,
											onRun: block("### Feature\n\nOne paragraph saying what it does."),
										})
										.addItem("screenshot", {
											label: "Screenshot",
											icon: SHOT_ICON,
											onRun: block(
												"![What the screenshot shows](hero)\n**Title** What to notice in it.",
											),
										});
								},
							}
						: {},
				},
			});
			// the repo's Prettier writes `-` bullets; so should the editor, or every save is a diff
			editor.editor.config((ctx) => {
				ctx.update(remarkStringifyOptionsCtx, (options) => ({ ...options, bullet: "-" as const }));
			});
			editor.on((listener) => {
				listener.markdownUpdated((_ctx, markdown) => {
					value = markdown;
				});
			});
			await editor.create();
			// the listener above is debounced: a save right after the last keystroke must
			// still post it, so the form asks the editor itself at submit time
			const form = node.closest("form");
			const onformdata = (event: FormDataEvent) => {
				event.formData.set(name, editor.getMarkdown());
			};
			form?.addEventListener("formdata", onformdata);
			destroy = () => {
				form?.removeEventListener("formdata", onformdata);
				void editor.destroy();
			};
			if (cancelled) {
				destroy();
			}
		})();
		return () => {
			cancelled = true;
			destroy?.();
		};
	}
</script>

<input type="hidden" {name} {value}>
<div class="editor" {@attach crepe}></div>

<style>
	/* Crepe's frame theme, recoloured with the site's own tokens so it follows light and dark */
	.editor :global(.milkdown) {
		--crepe-color-background: var(--color-surface);
		--crepe-color-on-background: var(--color-fg);
		--crepe-color-surface: var(--color-bg);
		--crepe-color-surface-low: var(--color-line);
		--crepe-color-on-surface: var(--color-fg);
		--crepe-color-on-surface-variant: var(--color-dim);
		--crepe-color-outline: var(--color-edge);
		--crepe-color-primary: var(--color-acid);
		--crepe-color-secondary: var(--color-line);
		--crepe-color-on-secondary: var(--color-fg);
		--crepe-color-inverse: var(--color-fg);
		--crepe-color-on-inverse: var(--color-bg);
		--crepe-color-inline-code: var(--color-cyan);
		--crepe-color-error: var(--color-plasma);
		--crepe-color-hover: var(--color-line);
		--crepe-color-selected: var(--color-edge);
		--crepe-color-inline-area: var(--color-line);
		--crepe-font-title: var(--font-sans);
		--crepe-font-default: var(--font-sans);
		--crepe-font-code: var(--font-mono);
		border: 1px solid var(--color-line);
		min-height: 24rem;
	}
</style>
