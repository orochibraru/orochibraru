import { getSearchConsole, searchStats } from "$lib/server/search-console";
import { getUmami, umamiReport } from "$lib/server/umami";

const RANGES = [7, 28, 90, 365];

export const load = async ({ url }) => {
	const asked = Number(url.searchParams.get("days"));
	const days = RANGES.includes(asked) ? asked : 28;
	const [umami, search] = await Promise.all([getUmami(), getSearchConsole()]);
	return {
		ranges: RANGES,
		days,
		umamiUrl: umami && `${umami.url}/websites/${encodeURIComponent(umami.websiteId)}`,
		// streamed: the page doesn't wait on either service
		umami: umami ? umamiReport(umami, days) : undefined,
		search: search ? searchStats(search, days) : undefined,
	};
};
