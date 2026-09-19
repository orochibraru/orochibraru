import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { type DB, openDatabase, useDatabase } from "../src/lib/server/db";

/** A throwaway DATA_DIR with a migrated database, made current for the app code. */
export function freshSite(): { db: DB; dir: string; cleanup: () => void } {
	const dir = mkdtempSync(`${tmpdir()}/site-`);
	const db = openDatabase(dir);
	useDatabase(db, dir);
	return {
		db,
		dir,
		cleanup: () => {
			db.$client.close();
			rmSync(dir, { recursive: true, force: true });
		},
	};
}

/** A real screenshot from the vendored docs: cwebp reads WebP as happily as PNG. */
export const SAMPLE_IMAGE = "src/docs/bercail/images/dashboard.webp";
