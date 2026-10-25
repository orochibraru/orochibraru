import { error } from "@sveltejs/kit";
import { getReport, summary, weekLabel } from "$lib/server/report";

export const load = ({ params }) => {
	const report = getReport(Number(params.id));
	if (!report) {
		throw error(404);
	}
	return {
		report: report.data,
		label: weekLabel(report.data),
		summary: summary(report.data),
		delivered: report.delivered,
	};
};
