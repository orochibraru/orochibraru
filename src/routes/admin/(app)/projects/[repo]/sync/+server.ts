import { error } from "@sveltejs/kit";
import { requireAdmin } from "#lib/server/admin.ts";
import { getProject, recentSyncRuns } from "#lib/server/editor.ts";
import { latestJob, queueSync } from "#lib/server/github/worker.ts";

const state = (repo: string) =>
	Response.json({ job: latestJob(repo) ?? null, runs: recentSyncRuns(10, repo) });

async function projectOf(event: Parameters<typeof requireAdmin>[0] & { params: { repo: string } }) {
	await requireAdmin(event);
	const row = getProject(event.params.repo);
	if (!row) {
		throw error(404);
	}
	return row.repo;
}

/** Where the project's sync stands: the page polls this while a job waits or runs. */
export const GET = async (event) => state(await projectOf(event));

/** Queue a sync and answer at once; the worker runs it in the background. */
export const POST = async (event) => {
	const repo = await projectOf(event);
	queueSync(repo, { reason: "manual" });
	return state(repo);
};
