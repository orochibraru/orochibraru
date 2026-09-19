import { fail } from "@sveltejs/kit";
import { imageUsages, listImages, setImageAlt } from "$lib/server/editor";
import { imageUrl, storeImage } from "$lib/server/images";

export const load = () => ({
	images: listImages().map((row) => ({
		id: row.id,
		url: imageUrl(row.sha256),
		width: row.width,
		height: row.height,
		alt: row.alt,
		label: row.project && row.name ? `${row.project} · ${row.name}` : "upload",
		usages: imageUsages(row),
	})),
});

export const actions = {
	upload: async ({ request }) => {
		const form = await request.formData();
		const file = form.get("file");
		if (!(file instanceof File) || !file.size) {
			return fail(400, { message: "Pick an image first" });
		}
		try {
			await storeImage(new Uint8Array(await file.arrayBuffer()), {
				source: "upload",
				alt: String(form.get("alt") ?? ""),
			});
		} catch (cause) {
			return fail(415, { message: cause instanceof Error ? cause.message : "Not an image" });
		}
	},
	alt: async ({ request }) => {
		const form = await request.formData();
		setImageAlt(Number(form.get("id")), String(form.get("alt") ?? ""));
	},
};
