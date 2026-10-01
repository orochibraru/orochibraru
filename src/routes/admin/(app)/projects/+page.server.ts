import { fail, redirect } from "@sveltejs/kit";
import { getProjectsPage, guideCounts } from "$lib/server/content";
import {
	createProject,
	docsStatuses,
	docsVersions,
	EditorError,
	lastSyncs,
	listAddableRepos,
	listAllProjects,
	reorderProjects,
	updateProjectsPage,
} from "$lib/server/editor";
import { imageByName } from "$lib/server/images";
import { getUmami, pathViews } from "$lib/server/umami";

export const load = async () => {
	const docs = docsStatuses();
	const guides = guideCounts();
	const versions = docsVersions();
	const syncs = new Map(lastSyncs().map((row) => [row.repo, row.run]));
	const rows = listAllProjects();
	const umami = await getUmami();
	return {
		projects: rows.map((row) => {
			const light = row.image ? imageByName(row.repo, row.image.src) : undefined;
			const dark = row.image ? imageByName(row.repo, `${row.image.src}-dark`) : undefined;
			const run = syncs.get(row.repo);
			return {
				repo: row.repo,
				name: row.name,
				category: row.category,
				blurb: row.blurb,
				published: row.published,
				githubRepo: row.githubRepo,
				updatedAt: row.updatedAt,
				shot: light && { light: light.url, dark: (dark ?? light).url },
				docs: docs[row.repo] ?? "not synced",
				guides: guides.get(row.repo) ?? 0,
				channels: versions
					.filter((version) => version.project === row.repo)
					.map(({ channel, ref }) => ({ channel, ref })),
				sync: run && { status: run.status, error: run.error, at: run.startedAt },
			};
		}),
		addable: listAddableRepos().map((repo) => repo.fullName),
		copy: getProjectsPage(),
		// a project's views are its page's plus its docs'; streamed, the list doesn't wait on Umami
		views: umami
			? pathViews(umami)
					.then((counts) => {
						const views: Record<string, number> = {};
						for (const [path, count] of Object.entries(counts)) {
							const repo = path.split("/")[1] ?? "";
							views[repo] = (views[repo] ?? 0) + count;
						}
						return views;
					})
					.catch(() => null)
			: undefined,
	};
};

const COPY = ["title", "description", "tag", "heading", "accent", "intro", "others"] as const;

export const actions = {
	move: async ({ request }) => {
		const form = await request.formData();
		const repo = String(form.get("repo"));
		const by = form.get("direction") === "up" ? -1 : 1;
		const order = listAllProjects().map((row) => row.repo);
		const from = order.indexOf(repo);
		const to = from + by;
		if (from < 0 || to < 0 || to >= order.length) {
			return;
		}
		[order[from], order[to]] = [order[to] as string, order[from] as string];
		reorderProjects(order);
	},
	add: async ({ request }) => {
		const fullName = String((await request.formData()).get("repo") ?? "");
		try {
			const created = createProject(fullName);
			throw redirect(303, `/admin/projects/${created.repo}`);
		} catch (cause) {
			if (cause instanceof EditorError) {
				return fail(400, { message: cause.message });
			}
			throw cause;
		}
	},
	copy: async ({ request }) => {
		const form = await request.formData();
		try {
			updateProjectsPage(
				Object.fromEntries(COPY.map((field) => [field, String(form.get(field) ?? "")])) as Record<
					(typeof COPY)[number],
					string
				>,
			);
		} catch (cause) {
			if (cause instanceof EditorError) {
				return fail(400, { message: cause.message });
			}
			throw cause;
		}
		return { saved: true };
	},
};
