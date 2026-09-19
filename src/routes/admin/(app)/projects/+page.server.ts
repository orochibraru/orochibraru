import { fail, redirect } from "@sveltejs/kit";
import {
	createProject,
	EditorError,
	listAddableRepos,
	listAllProjects,
	reorderProjects,
} from "$lib/server/editor";

export const load = () => ({
	projects: listAllProjects().map(({ repo, name, category, published, githubRepo }) => ({
		repo,
		name,
		category,
		published,
		githubRepo,
	})),
	addable: listAddableRepos().map((repo) => repo.fullName),
});

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
};
