import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { user } from "./db/schema";
import { isAdminEmail } from "./env";

/** The token's subject is a better-auth user id; its email decides, as for the admin. */
export async function isTokenOnAllowlist(claims: { sub?: string }): Promise<boolean> {
	if (!claims.sub) {
		return false;
	}
	const row = getDb().select({ email: user.email }).from(user).where(eq(user.id, claims.sub)).get();
	return isAdminEmail(row?.email);
}
