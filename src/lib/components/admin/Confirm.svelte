<script lang="ts">
	type Question = { title: string; body: string; action: string };

	let dialog = $state<HTMLDialogElement>();
	let question = $state<Question>({ title: "", body: "", action: "" });
	let answer: ((ok: boolean) => void) | undefined;

	/** confirm(), as a modal of ours: resolves true only when the action button is chosen. */
	export function ask(next: Question): Promise<boolean> {
		question = next;
		if (dialog) {
			// Escape closes without touching returnValue: clear the last answer first
			dialog.returnValue = "";
			dialog.showModal();
		}
		return new Promise((resolve) => {
			answer = resolve;
		});
	}

	/**
	 * A submit button's onclick: holds the submission until the question is answered,
	 * then resubmits with the same button, so its formaction and use:enhance still apply.
	 */
	export function guard(event: MouseEvent & { currentTarget: HTMLButtonElement }, next: Question) {
		event.preventDefault();
		const button = event.currentTarget;
		ask(next).then((ok) => {
			if (ok) {
				button.form?.requestSubmit(button);
			}
		});
	}
</script>

<!-- a modal <dialog> already traps focus, closes on Escape and draws the backdrop;
     Cancel comes first, so it has the focus when the dialog opens -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialog}
	aria-labelledby="confirm-title"
	class="mx-auto mt-[20vh] w-[min(26rem,calc(100vw-2rem))] max-w-none rounded-xl border border-edge bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/40"
	onclick={(event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	}}
	onclose={() => {
		answer?.(dialog?.returnValue === "yes");
		answer = undefined;
	}}
>
	<form method="dialog" class="p-5">
		<h2 id="confirm-title" class="text-[.9375rem] font-semibold">{question.title}</h2>
		<p class="mt-2 text-sm text-dim">{question.body}</p>
		<div class="mt-5 flex justify-end gap-2">
			<button class="abtn" value="">Cancel</button>
			<button class="abtn border-hot bg-hot text-white hover:border-hot hover:brightness-110" value="yes"
				>{question.action}</button
			>
		</div>
	</form>
</dialog>
