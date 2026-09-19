// The GitHub App this site creates for itself (manifest flow) and then uses to
// read its projects' repos: app JWTs, installation tokens, and a small API helper.
import { createPrivateKey, createSign } from "node:crypto";
import { eq } from "drizzle-orm";
import { open, seal } from "../crypto";
import { getDb } from "../db";
import { githubApp, installedRepo } from "../db/schema";
import { env } from "../env";

const API = "https://api.github.com";

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

let fetcher: Fetch = (input, init) => fetch(input, init);

/** Tests swap GitHub for a fake. */
export const useGithubFetch = (fake: Fetch) => {
	fetcher = fake;
	tokens.clear();
};

export class GithubError extends Error {}

/** What GitHub is told the app is: read-only on contents, one webhook, push events. */
export function manifest(origin = env.origin) {
	return {
		name: `${new URL(origin).hostname} docs`,
		url: origin,
		hook_attributes: { url: `${origin}/api/github/webhook`, active: true },
		redirect_url: `${origin}/admin/github/callback`,
		setup_url: `${origin}/admin/github`,
		setup_on_update: true,
		public: false,
		default_permissions: { contents: "read", metadata: "read" },
		// installation and installation_repositories always reach an app's webhook
		default_events: ["push"],
	};
}

/** Where the manifest form posts: the account's apps, or an organisation's. */
export const manifestTarget = (state: string, organization?: string) =>
	`https://github.com/${organization ? `organizations/${encodeURIComponent(organization)}/` : ""}settings/apps/new?state=${encodeURIComponent(state)}`;

export type App = {
	appId: number;
	slug: string;
	clientId: string;
	privateKey: string;
	webhookSecret: string;
	installationId: number | null;
};

/** The app's credentials, unsealed; null until one has been created. */
export async function getGithubApp(): Promise<App | null> {
	const row = getDb().select().from(githubApp).where(eq(githubApp.id, 1)).get();
	if (!row) {
		return null;
	}
	return {
		appId: row.appId,
		slug: row.slug,
		clientId: row.clientId,
		privateKey: await open(row.privateKey),
		webhookSecret: await open(row.webhookSecret),
		installationId: row.installationId,
	};
}

/** Step two of the manifest flow: GitHub hands the new app's credentials over once. */
export async function exchangeManifestCode(code: string) {
	const response = await fetcher(`${API}/app-manifests/${encodeURIComponent(code)}/conversions`, {
		method: "POST",
		headers: { accept: "application/vnd.github+json" },
	});
	if (!response.ok) {
		throw new GithubError(`GitHub refused the manifest code: ${response.status}`);
	}
	const app = (await response.json()) as {
		id: number;
		slug: string;
		client_id: string;
		client_secret: string;
		pem: string;
		webhook_secret: string;
	};
	const values = {
		id: 1,
		appId: app.id,
		slug: app.slug,
		clientId: app.client_id,
		clientSecret: await seal(app.client_secret),
		privateKey: await seal(app.pem),
		webhookSecret: await seal(app.webhook_secret),
		installationId: null,
	};
	getDb()
		.insert(githubApp)
		.values(values)
		.onConflictDoUpdate({ target: githubApp.id, set: values })
		.run();
	tokens.clear();
	return { slug: app.slug };
}

/** Forget the app here (it still exists on GitHub until deleted there). */
export function forgetGithubApp() {
	const db = getDb();
	db.delete(githubApp).run();
	db.delete(installedRepo).run();
	tokens.clear();
}

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** A ten-minute RS256 JWT as the app itself (GitHub's key is PKCS#1, which node:crypto reads). */
export function appJwt(
	app: Pick<App, "appId" | "privateKey">,
	now = Math.floor(Date.now() / 1000),
) {
	const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
	// iat a minute back: GitHub rejects tokens from a clock that runs ahead
	const payload = base64url(
		JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(app.appId) }),
	);
	const signature = createSign("RSA-SHA256")
		.update(`${header}.${payload}`)
		.sign(createPrivateKey(app.privateKey));
	return `${header}.${payload}.${base64url(signature)}`;
}

const tokens = new Map<number, { token: string; expires: number }>();

/** An installation token, reused until five minutes before it expires. */
export async function installationToken(app: App): Promise<string> {
	if (!app.installationId) {
		throw new GithubError("the GitHub App isn't installed yet");
	}
	const cached = tokens.get(app.installationId);
	if (cached && cached.expires - Date.now() > 5 * 60_000) {
		return cached.token;
	}
	const response = await fetcher(`${API}/app/installations/${app.installationId}/access_tokens`, {
		method: "POST",
		headers: { accept: "application/vnd.github+json", authorization: `Bearer ${appJwt(app)}` },
	});
	if (!response.ok) {
		throw new GithubError(`GitHub refused an installation token: ${response.status}`);
	}
	const body = (await response.json()) as { token: string; expires_at: string };
	tokens.set(app.installationId, { token: body.token, expires: Date.parse(body.expires_at) });
	return body.token;
}

/** A GET against the API as the installation. */
export async function github<T>(app: App, path: string): Promise<T> {
	const response = await fetcher(`${API}${path}`, {
		headers: {
			accept: "application/vnd.github+json",
			authorization: `Bearer ${await installationToken(app)}`,
			"x-github-api-version": "2022-11-28",
		},
	});
	if (!response.ok) {
		throw new GithubError(`GitHub answered ${response.status} for ${path}`);
	}
	return (await response.json()) as T;
}

type Repo = { full_name: string; default_branch: string; private: boolean };

/** Record the installation, then the repos it grants: the ones that can become projects. */
export async function recordInstallation(installationId: number) {
	getDb().update(githubApp).set({ installationId }).where(eq(githubApp.id, 1)).run();
	tokens.clear();
	await refreshInstalledRepos();
}

/** The app was uninstalled: nothing is readable until it is installed again. */
export function forgetInstallation() {
	getDb().update(githubApp).set({ installationId: null }).where(eq(githubApp.id, 1)).run();
	getDb().delete(installedRepo).run();
	tokens.clear();
}

export async function refreshInstalledRepos() {
	const app = await getGithubApp();
	if (!app?.installationId) {
		return;
	}
	const repos: Repo[] = [];
	for (let page = 1; ; page++) {
		const batch = await github<{ repositories: Repo[] }>(
			app,
			`/installation/repositories?per_page=100&page=${page}`,
		);
		repos.push(...batch.repositories);
		if (batch.repositories.length < 100) {
			break;
		}
	}
	const installationId = app.installationId;
	getDb().transaction((tx) => {
		tx.delete(installedRepo).run();
		for (const repo of repos) {
			tx.insert(installedRepo)
				.values({
					fullName: repo.full_name,
					installationId,
					defaultBranch: repo.default_branch,
					private: repo.private,
				})
				.run();
		}
	});
}
