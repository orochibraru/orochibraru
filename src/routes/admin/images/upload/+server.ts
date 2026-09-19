import { error, json } from "@sveltejs/kit";
import { requireAdmin } from "$lib/server/admin";
import { storeImage } from "$lib/server/images";

const LIMIT = 20 * 1024 * 1024;

export const POST = async (event) => {
	await requireAdmin(event);
	const file = (await event.request.formData()).get("file");
	if (!(file instanceof File)) {
		throw error(400, "Expected a file field");
	}
	if (file.size > LIMIT) {
		throw error(413, "Images are limited to 20 MB");
	}
	try {
		const stored = await storeImage(new Uint8Array(await file.arrayBuffer()), {
			source: "upload",
			alt: file.name.replace(/\.[^.]+$/, ""),
		});
		return json(stored);
	} catch (cause) {
		throw error(415, cause instanceof Error ? cause.message : "Not an image");
	}
};
