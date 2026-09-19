import { requireAdmin } from "$lib/server/admin";
import { reconcile } from "$lib/server/github/sync";

/** "Sync every project now": reconcile, narrated line by line as plain text. */
export const POST = async (event) => {
	await requireAdmin(event);
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			// the dialog may be closed mid-run: the sync carries on, only the telling stops
			const log = (line: string) => {
				try {
					controller.enqueue(encoder.encode(`${line}\n`));
				} catch {}
			};
			await reconcile(log).catch((cause) => log(`✗ ${cause}`));
			try {
				controller.close();
			} catch {}
		},
	});
	return new Response(body, {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "no-store",
			// a buffering proxy would deliver the whole log at the end
			"x-accel-buffering": "no",
		},
	});
};
