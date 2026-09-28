import { requireAdmin } from "$lib/server/admin";
import { reconcile } from "$lib/server/github/sync";

export type SyncEvent = { repo: string; error?: string };

/** "Sync every project now": reconcile, one JSON line per project as it finishes. */
export const POST = async (event) => {
	await requireAdmin(event);
	const encoder = new TextEncoder();
	const body = new ReadableStream<Uint8Array>({
		async start(controller) {
			// the page may be left mid-run: the sync carries on, only the telling stops
			const send = (line: SyncEvent) => {
				try {
					controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
				} catch {}
			};
			await reconcile(undefined, (repo, error) => send({ repo, error })).catch((cause) =>
				send({ repo: "", error: String(cause) }),
			);
			try {
				controller.close();
			} catch {}
		},
	});
	return new Response(body, {
		headers: {
			"content-type": "application/x-ndjson",
			"cache-control": "no-store",
			// a buffering proxy would deliver every line at the end
			"x-accel-buffering": "no",
		},
	});
};
