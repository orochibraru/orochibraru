import { requireAdmin } from "$lib/server/admin";

export const load = async (event) => ({ admin: await requireAdmin(event) });
