import { error } from "@sveltejs/kit";
import { screenshotWebp } from "$lib/server/images";

export const GET = async ({ params }) => {
	const webp = await screenshotWebp(params.sha);
	if (!webp) {
		throw error(404);
	}
	return new Response(webp, {
		headers: {
			"content-type": "image/webp",
			"cache-control": "public, max-age=31536000, immutable",
		},
	});
};
