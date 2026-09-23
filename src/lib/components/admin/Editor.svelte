<script lang="ts">
	import "@milkdown/crepe/theme/common/style.css";
	import { dark } from "$lib/mermaid";
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
	const BULLET_ICON =
		'<svg viewBox="0 0 6 6" width="6" height="6"><circle cx="3" cy="3" r="2.5"/></svg>';
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
				{ projectLayout },
				{ syntaxHighlighting },
				{ classHighlighter },
			] = await Promise.all([
				import("@milkdown/crepe"),
				import("@milkdown/kit/core"),
				import("@milkdown/kit/utils"),
				import("@milkdown/kit/preset/commonmark"),
				import("./project-layout"),
				import("@codemirror/language"),
				import("@lezer/highlight"),
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
					// tok-* classes, coloured below with the site's Shiki themes
					[CrepeFeature.CodeMirror]: { extensions: [syntaxHighlighting(classHighlighter)] },
					[CrepeFeature.ListItem]: { bulletIcon: BULLET_ICON },
					[CrepeFeature.ImageBlock]: {
						onUpload: upload,
						// display only: the Markdown keeps the name. Screenshots have a -dark twin.
						proxyDomURL: (url: string) => (dark() && images[`${url}-dark`]) || images[url] || url,
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
			if (conventions) {
				editor.editor.use(projectLayout());
			}
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
<div class={["editor", conventions && "project-look"]} {@attach crepe}></div>

<style>
	/* Crepe's frame theme, recoloured with the site's own tokens so it follows light and dark */
	.editor :global(.milkdown) {
		--crepe-color-background: var(--color-bg);
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
		/* rem, so the admin's larger root size scales the editor too */
		--crepe-base-font-size: 1rem;
		border: 1px solid var(--color-line);
		min-height: calc(100dvh - 16rem);
	}

	/* The text itself, set the way the site sets it (.md and .project in app.css),
	   so what is typed here reads like what gets published. */
	.editor :global(.milkdown .ProseMirror) {
		padding: 2.5rem 2rem 4rem 4.5rem;
		line-height: 1.65;
	}
	.editor :global(.milkdown .ProseMirror :is(p, ul, ol, blockquote)) {
		max-width: 80ch;
		color: var(--color-dim);
	}
	.editor :global(.milkdown .ProseMirror p) {
		font-size: 1rem;
		line-height: 1.65;
		padding: 0;
		margin-bottom: 1.25rem;
	}
	.editor :global(.milkdown .ProseMirror :is(strong, b)) {
		color: var(--color-fg);
		font-weight: 600;
	}
	.editor :global(.milkdown .ProseMirror :is(h1, h2, h3, h4)) {
		color: var(--color-fg);
		font-weight: 700;
		padding: 0;
	}
	.editor :global(.milkdown .ProseMirror h1) {
		font-size: 1.875rem;
		line-height: 1.2;
		letter-spacing: -0.03em;
		margin: 3rem 0 1.25rem;
	}
	.editor :global(.milkdown .ProseMirror h2) {
		font-size: 1.5rem;
		line-height: 1.33;
		letter-spacing: -0.02em;
		margin: 3rem 0 1rem;
	}
	.editor :global(.milkdown .ProseMirror h3) {
		font-size: 1.125rem;
		line-height: 1.5;
		letter-spacing: -0.01em;
		margin: 2rem 0 0.75rem;
	}
	.editor :global(.milkdown .ProseMirror h4) {
		font-size: 0.95rem;
		margin: 1.5rem 0 0.5rem;
	}
	.editor :global(.milkdown .ProseMirror > :first-child) {
		margin-top: 0;
	}
	.editor :global(.milkdown .ProseMirror code) {
		color: var(--color-cyan);
		background: none;
		padding: 0;
		font-size: 0.9em;
		display: inline;
	}
	.editor :global(.milkdown .ProseMirror a) {
		color: var(--color-cyan);
		text-decoration: none;
		border-bottom: 1px solid var(--color-edge);
	}
	.editor :global(.milkdown .ProseMirror blockquote) {
		padding-left: 1.25rem;
		font-style: italic;
		border-left: 2px solid var(--color-acid);
	}
	.editor :global(.milkdown .ProseMirror blockquote::before) {
		display: none;
	}
	.editor :global(.milkdown .ProseMirror img) {
		border: 1px solid var(--color-line);
	}

	/* lists: the acid disc and the tight rhythm of .md li */
	.editor :global(.milkdown .milkdown-list-item-block li) {
		gap: 0.625rem;
	}
	.editor :global(.milkdown .milkdown-list-item-block li .label-wrapper),
	.editor :global(.milkdown .milkdown-list-item-block li .label-wrapper .label) {
		width: 0.5rem;
		height: 1.65rem;
		padding: 0;
		color: var(--color-acid);
	}
	.editor :global(.milkdown .milkdown-list-item-block li .label-wrapper svg) {
		fill: var(--color-acid);
	}
	.editor :global(.milkdown .ProseMirror :is(ul, ol) p) {
		margin: 0;
	}
	.editor :global(.milkdown .ProseMirror :is(ul, ol) > * + *) {
		margin-top: 0.5rem;
	}

	/* code blocks: the site's bordered box, no editor chrome, Shiki's github themes */
	.editor :global(.milkdown .milkdown-code-block) {
		border: 1px solid var(--color-line);
		border-radius: 0;
		background: var(--color-surface);
		padding: 1.25rem 1.375rem;
	}
	.editor :global(.milkdown .milkdown-code-block .tools) {
		position: absolute;
		top: 0.5rem;
		right: 0.75rem;
		left: 1.375rem;
		z-index: 1;
	}
	.editor :global(.milkdown .milkdown-code-block .tools .language-button) {
		margin: 0;
	}
	.editor :global(.milkdown .milkdown-code-block .cm-editor) {
		background: transparent;
	}
	.editor :global(.milkdown .milkdown-code-block :is(.cm-gutters, .cm-foldGutter)) {
		display: none;
	}
	.editor :global(.milkdown .milkdown-code-block .cm-activeLine) {
		background: transparent;
	}
	.editor :global(.milkdown .milkdown-code-block .cm-scroller) {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		line-height: 1.7;
	}
	.editor :global(.milkdown .milkdown-code-block :is(.cm-content, .cm-line)) {
		padding: 0;
		color: var(--tok-fg);
	}
	.editor {
		--tok-fg: #1f2328;
		--tok-keyword: #cf222e;
		--tok-string: #0a3069;
		--tok-comment: #6e7781;
		--tok-number: #0550ae;
		--tok-property: #116329;
		--tok-type: #953800;
		--tok-function: #8250df;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme="light"])) .editor {
			--tok-fg: #e6edf3;
			--tok-keyword: #ff7b72;
			--tok-string: #a5d6ff;
			--tok-comment: #8b949e;
			--tok-number: #79c0ff;
			--tok-property: #7ee787;
			--tok-type: #ffa657;
			--tok-function: #d2a8ff;
		}
	}
	:global(:root[data-theme="dark"]) .editor {
		--tok-fg: #e6edf3;
		--tok-keyword: #ff7b72;
		--tok-string: #a5d6ff;
		--tok-comment: #8b949e;
		--tok-number: #79c0ff;
		--tok-property: #7ee787;
		--tok-type: #ffa657;
		--tok-function: #d2a8ff;
	}
	.editor :global(:is(.tok-keyword, .tok-operator, .tok-modifier)) {
		color: var(--tok-keyword);
	}
	.editor :global(:is(.tok-string, .tok-string2, .tok-url, .tok-inserted)) {
		color: var(--tok-string);
	}
	.editor :global(:is(.tok-comment, .tok-meta)) {
		color: var(--tok-comment);
	}
	.editor :global(:is(.tok-number, .tok-bool, .tok-atom, .tok-literal, .tok-labelName)) {
		color: var(--tok-number);
	}
	.editor :global(.tok-propertyName) {
		color: var(--tok-property);
	}
	.editor :global(:is(.tok-typeName, .tok-className, .tok-namespace)) {
		color: var(--tok-type);
	}
	.editor :global(.tok-definition) {
		color: var(--tok-function);
	}
	.editor :global(:is(.tok-variableName, .tok-punctuation)) {
		color: var(--tok-fg);
	}

	/* Project pages: the classes come from project-layout.ts, which mirrors how the
	   server groups the page. Two columns; everything spans both except grid cells. */
	.project-look :global(.milkdown .ProseMirror) {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-auto-flow: row dense;
		align-content: start;
	}
	.project-look :global(.milkdown .ProseMirror > *),
	.project-look :global(.milkdown .ProseMirror > p),
	.project-look :global(.milkdown .ProseMirror > h1),
	.project-look :global(.milkdown .ProseMirror > h2),
	.project-look :global(.milkdown .ProseMirror > h3),
	.project-look :global(.milkdown .ProseMirror > h4) {
		grid-column: 1 / -1;
		margin: 1.25rem 0 0;
	}
	.project-look :global(.milkdown .ProseMirror > :first-child) {
		margin-top: 0;
	}
	/* Crepe's caret is an absolute child placed from the padding edge; an explicit
	   grid column would measure it from the content edge, a padding's width off */
	.project-look :global(.milkdown .ProseMirror > .prosemirror-virtual-cursor) {
		grid-column: auto;
	}
	.project-look :global(.milkdown .ProseMirror > h2) {
		margin: 5.625rem 0 0;
	}
	.project-look :global(.milkdown .ProseMirror > h2.ruled) {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.project-look :global(.milkdown .ProseMirror > h2.ruled::after) {
		content: "";
		flex: 1;
		height: 1px;
		background: var(--color-line);
	}
	.project-look :global(.milkdown .ProseMirror > h3.label) {
		margin: 2rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 400;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-dim);
	}
	.project-look :global(.milkdown .ProseMirror > h3.label + *) {
		margin-top: 0.75rem;
	}
	.project-look :global(.milkdown .ProseMirror > p.lede) {
		font-size: 1.15rem;
		max-width: 72ch;
	}
	.project-look :global(.milkdown .ProseMirror > .lede + *) {
		margin-top: 2.5rem;
	}

	/* grid cells: .feat and .shot, hairlines shared between neighbours */
	.project-look :global(.milkdown .ProseMirror > .cell) {
		max-width: none;
		margin: -1px 0 0;
		background: var(--color-surface);
		border-inline: 1px solid var(--color-line);
	}
	.project-look :global(.milkdown .ProseMirror > .cell-a) {
		grid-column: 1;
		margin-right: -1px;
	}
	.project-look :global(.milkdown .ProseMirror > .cell-b) {
		grid-column: 2;
	}
	.project-look :global(.milkdown .ProseMirror > .run-start) {
		margin-top: 1.75rem;
	}
	.project-look :global(.milkdown .ProseMirror > .cell + :not(.cell, h2)) {
		margin-top: 1.75rem;
	}
	.project-look :global(.milkdown .ProseMirror > .tile-head) {
		border-top: 1px solid var(--color-line);
		padding: 1.5rem 1.625rem 0.375rem;
		font-size: 1rem;
	}
	.project-look :global(.milkdown .ProseMirror > .tile-head::before) {
		content: "// ";
		color: var(--color-acid);
	}
	.project-look :global(.milkdown .ProseMirror > p.tile-body) {
		margin-top: 0;
		border-bottom: 1px solid var(--color-line);
		padding: 0 1.625rem 1.5rem;
		font-size: 0.9rem;
	}
	.project-look :global(.milkdown .ProseMirror > .shot) {
		border-block: 1px solid var(--color-line);
		padding: 1.25rem;
		font-size: 0.9rem;
		line-height: 1.6;
		white-space: normal;
	}
	.project-look :global(.milkdown .ProseMirror > .shot .milkdown-image-inline) {
		display: block;
		margin-bottom: 1rem;
	}
	.project-look :global(.milkdown .ProseMirror > .shot img) {
		display: block;
		width: 100%;
		height: auto;
	}
	.project-look :global(.milkdown .ProseMirror > .shot > strong:first-of-type) {
		display: block;
	}
	/* an odd run leaves a cell empty: the grid's line colour shows there, as on the site */
	.project-look :global(.milkdown .ProseMirror > .spacer) {
		background: var(--color-line);
	}
	.project-look :global(.milkdown .ProseMirror > .spacer.tall) {
		grid-row: span 2;
	}
</style>
