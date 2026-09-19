// The apps connected to the MCP server: OAuth clients, as better-auth stores them.
import { and, desc, eq, gt, isNull, max, sql } from "drizzle-orm";
import { getDb } from "./db";
import { oauthClient, oauthConsent, oauthRefreshToken } from "./db/schema";

export type Connection = {
	clientId: string;
	name: string;
	createdAt: Date | null;
	disabled: boolean;
	activeGrants: number;
	lastAuthorized: Date | null;
};

export function listConnections(): Connection[] {
	const db = getDb();
	const now = new Date();
	const grants = db
		.select({
			clientId: oauthRefreshToken.clientId,
			active: sql<number>`count(*)`,
			last: max(oauthRefreshToken.createdAt),
		})
		.from(oauthRefreshToken)
		.where(and(isNull(oauthRefreshToken.revoked), gt(oauthRefreshToken.expiresAt, now)))
		.groupBy(oauthRefreshToken.clientId)
		.all();
	const byClient = new Map(grants.map((grant) => [grant.clientId, grant]));
	return db
		.select()
		.from(oauthClient)
		.orderBy(desc(oauthClient.createdAt))
		.all()
		.map((client) => ({
			clientId: client.clientId,
			name: client.name || client.clientId,
			createdAt: client.createdAt,
			disabled: client.disabled ?? false,
			activeGrants: byClient.get(client.clientId)?.active ?? 0,
			lastAuthorized: byClient.get(client.clientId)?.last ?? null,
		}));
}

/**
 * Cut an app off: no refresh token works again, consent must be given anew, and
 * the client can't start a new authorization. Access tokens are short-lived JWTs,
 * so one already issued lasts until it expires.
 */
export function revokeConnection(clientId: string) {
	const db = getDb();
	db.transaction((tx) => {
		tx.update(oauthRefreshToken)
			.set({ revoked: new Date() })
			.where(and(eq(oauthRefreshToken.clientId, clientId), isNull(oauthRefreshToken.revoked)))
			.run();
		tx.delete(oauthConsent).where(eq(oauthConsent.clientId, clientId)).run();
		tx.update(oauthClient).set({ disabled: true }).where(eq(oauthClient.clientId, clientId)).run();
	});
}

/** What the consent screen calls an app: the name it registered with, else its id. */
export const clientName = (clientId: string) =>
	getDb()
		.select({ name: oauthClient.name })
		.from(oauthClient)
		.where(eq(oauthClient.clientId, clientId))
		.get()?.name || clientId;
