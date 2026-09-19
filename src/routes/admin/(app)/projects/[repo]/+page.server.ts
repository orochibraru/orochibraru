import { error, fail } from "@sveltejs/kit";
import {
	EditorError,
	getProject,
	projectImages,
	recentSyncRuns,
	updateProject,
} from "$lib/server/editor";
import { syncRepo } from "$lib/server/github/sync";

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
	images: projectImages(params.repo),
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
	resync: async ({ params }) => {
		const result = await syncRepo(projectOr404(params.repo).repo);
		if (result.status !== "ok") {
			return fail(result.status === "failed" ? 502 : 409, {
				message: result.error ?? "Sync failed",
			});
		}
		return { synced: result.changed };
	},
};
