// The GitHub App's one webhook: installation changes, and pushes that touch docs.
import { createHmac, timingSafeEqual } from "node:crypto";
import { lt } from "drizzle-orm";
import { getDb } from "../db";
import { webhookDelivery } from "../db/schema";
import { forgetInstallation, getGithubApp, recordInstallation, refreshInstalledRepos } from "./app";
import { projectsForPush, syncRepo, touchesDocs } from "./sync";

/** X-Hub-Signature-256 is "sha256=" + the hex HMAC of the raw body. */
export function verifySignature(secret: string, body: string, header: string | null): boolean {
	if (!header?.startsWith("sha256=")) {
		return false;
	}
	const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
	const given = Buffer.from(header.slice("sha256=".length));
	return expected.length === given.length && timingSafeEqual(expected, given);
}

/** True the first time a delivery id is seen; GitHub redelivers, attackers replay. */
function firstDelivery(id: string): boolean {
	const db = getDb();
	db.delete(webhookDelivery)
		.where(lt(webhookDelivery.receivedAt, new Date(Date.now() - 7 * 24 * 3600_000)))
		.run();
	const inserted = db
		.insert(webhookDelivery)
		.values({ id })
		.onConflictDoNothing()
		.returning()
		.all();
	return inserted.length > 0;
}

type Push = {
	ref: string;
	after: string;
	repository: { full_name: string };
	commits?: { added?: string[]; modified?: string[]; removed?: string[] }[];
};

type Installation = { action: string; installation: { id: number } };

/** Work is started, not awaited: GitHub wants an answer within ten seconds. */
export async function handleWebhook(request: Request): Promise<Response> {
	const app = await getGithubApp();
	if (!app) {
		return new Response("No GitHub App configured", { status: 404 });
	}
	const body = await request.text();
	if (!verifySignature(app.webhookSecret, body, request.headers.get("x-hub-signature-256"))) {
		return new Response("Bad signature", { status: 401 });
	}
	const delivery = request.headers.get("x-github-delivery");
	if (!delivery || !firstDelivery(delivery)) {
		return new Response("Already handled", { status: 200 });
	}

	const event = request.headers.get("x-github-event");
	const payload = JSON.parse(body) as unknown;
	const background = (work: Promise<unknown>) => {
		work.catch((cause) => console.error(`webhook ${event} ${delivery}:`, cause));
	};

	if (event === "installation") {
		const { action, installation } = payload as Installation;
		if (action === "deleted") {
			forgetInstallation();
		} else {
			background(recordInstallation(installation.id));
		}
	} else if (event === "installation_repositories") {
		background(refreshInstalledRepos());
	} else if (event === "push") {
		const push = payload as Push;
		const paths = (push.commits ?? []).flatMap((commit) => [
			...(commit.added ?? []),
			...(commit.modified ?? []),
			...(commit.removed ?? []),
		]);
		// GitHub lists at most 20 commits: past that, assume the docs moved
		const relevant = (push.commits?.length ?? 0) >= 20 || touchesDocs(paths);
		if (relevant) {
			for (const repo of projectsForPush(push.repository.full_name, push.ref)) {
				background(syncRepo(repo, push.after));
			}
		}
	}
	return new Response("Accepted", { status: 202 });
}
