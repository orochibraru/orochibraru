import { requireAdmin } from "$lib/server/admin";
import { clientName } from "$lib/server/connections";

export const load = async (event) => {
	const admin = await requireAdmin(event);
	const params = event.url.searchParams;
	return {
		admin,
		client: clientName(params.get("client_id") ?? ""),
		scopes: (params.get("scope") ?? "").split(" ").filter(Boolean),
	};
};
