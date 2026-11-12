import { error, fail, redirect } from "@sveltejs/kit";
import {
	deleteProject,
	docsVersions,
	EditorError,
	getProject,
	lastSyncs,
	linkProjectRepo,
	listAddableRepos,
	projectImages,
	recentSyncRuns,
	updateProject,
} from "#lib/server/editor.ts";
import { latestJob, queueSync } from "#lib/server/github/worker.ts";

const projectOr404 = (repo: string) => {
	const row = getProject(repo);
	if (!row) {
		throw error(404);
	}
	return row;
};

export const load = ({ params }) => ({
	project: projectOr404(params.repo),
	runs: recentSyncRuns(10, params.repo),
	job: latestJob(params.repo) ?? null,
	versions: docsVersions(params.repo).map(({ channel, ref, sha }) => ({ channel, ref, sha })),
	images: projectImages(params.repo),
	linkable: listAddableRepos().map((repo) => repo.fullName),
	readable: lastSyncs().some((row) => row.repo === params.repo && row.readable),
});

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

const json = (form: FormData, name: string, fallback: unknown) => {
	const raw = text(form, name);
	if (!raw) {
		return fallback;
	}
	try {
		return JSON.parse(raw);
	} catch {
		throw new EditorError(`${name} isn't valid JSON`);
	}
};

export const actions = {
	save: async ({ params, request }) => {
		const row = projectOr404(params.repo);
		const form = await request.formData();
		try {
			const imageSrc = text(form, "imageSrc");
			updateProject(row.repo, {
				name: text(form, "name"),
				tag: text(form, "tag"),
				title: text(form, "title"),
				description: text(form, "description"),
				image: imageSrc ? { src: imageSrc, alt: text(form, "imageAlt") } : null,
				buttons: json(form, "buttons", []),
				schema: json(form, "schema", {}),
				category: text(form, "category"),
				blurb: text(form, "blurb"),
				chips: text(form, "chips")
					.split(",")
					.map((chip) => chip.trim())
					.filter(Boolean),
				body: String(form.get("body") ?? ""),
				published: form.get("published") === "on",
			});
		} catch (cause) {
			if (cause instanceof EditorError) {
				return fail(400, { message: cause.message });
			}
			throw cause;
		}
		return { saved: true };
	},
	link: async ({ params, request }) => {
		const row = projectOr404(params.repo);
		const fullName = text(await request.formData(), "githubRepo") || null;
		try {
			linkProjectRepo(row.repo, fullName);
		} catch (cause) {
			if (cause instanceof EditorError) {
				return fail(400, { message: cause.message });
			}
			throw cause;
		}
		if (fullName) {
			queueSync(row.repo, { reason: "manual" });
		}
		return { linked: fullName };
	},
	delete: ({ params }) => {
		deleteProject(projectOr404(params.repo).repo);
		throw redirect(303, "/admin/projects");
	},
};
