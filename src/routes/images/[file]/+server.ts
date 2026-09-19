import { join } from "node:path";
import { error } from "@sveltejs/kit";
import { getDataDir } from "$lib/server/db";

export const GET = async ({ params }) => {
	// content-addressed: the name is the hash, so nothing else is ever a file here
	if (!/^[0-9a-f]{64}\.webp$/.test(params.file)) {
		throw error(404);
	}
	const file = Bun.file(join(getDataDir(), "images", params.file));
	if (!(await file.exists())) {
		throw error(404);
	}
	return new Response(file, {
		headers: {
			"content-type": "image/webp",
			"cache-control": "public, max-age=31536000, immutable",
		},
	});
};
