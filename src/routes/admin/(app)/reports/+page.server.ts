import { fail } from "@sveltejs/kit";
import { notify, publicKey, subscriptions, unsubscribe } from "$lib/server/push";
import { listReports, runWeeklyReport, sendReport, summary, weekLabel } from "$lib/server/report";

export const load = async () => ({
	reports: listReports().map((report) => ({
		id: report.id,
		label: weekLabel(report.data),
		summary: summary(report.data),
		delivered: report.delivered,
	})),
	devices: subscriptions().map(({ endpoint, device, createdAt, lastSentAt }) => ({
		endpoint,
		device,
		createdAt,
		lastSentAt,
	})),
	publicKey: await publicKey(),
});

export const actions = {
	test: async () => {
		const delivered = await notify({
			title: "Notifications are on",
			body: "The weekly report lands here every Monday morning.",
			url: "/admin/reports",
			tag: "test",
		});
		return delivered
			? { sent: delivered }
			: fail(409, { message: "No browser took it. Turn notifications on first." });
	},
	// the report due now: built if it isn't yet, and pushed again if it was
	send: async () => {
		const { report, sent } = await runWeeklyReport();
		if (report && !sent) {
			await sendReport(report.id, report.data);
		}
		return { built: true };
	},
	forget: async ({ request }) => {
		unsubscribe(String((await request.formData()).get("endpoint") ?? ""));
		return { forgotten: true };
	},
};
