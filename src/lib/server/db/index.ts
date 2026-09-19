import { Database } from "bun:sqlite";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { env } from "../env";
import * as schema from "./schema";

export type DB = BunSQLiteDatabase<typeof schema> & { $client: Database };

/**
 * Opens (creating if needed) DATA_DIR/site.db and brings it up to date. The
 * migrations folder ships next to the binary; MIGRATIONS_DIR overrides it.
 */
export function openDatabase(dir: string, migrations = "drizzle", seed?: string): DB {
	// a brand-new volume starts from the content the image was built with
	if (seed && existsSync(`${seed}/site.db`) && !existsSync(`${dir}/site.db`)) {
		cpSync(seed, dir, { recursive: true });
	}
	mkdirSync(`${dir}/images`, { recursive: true });
	const client = new Database(`${dir}/site.db`, { create: true, strict: true });
	client.run("PRAGMA journal_mode = WAL");
	client.run("PRAGMA foreign_keys = ON");
	client.run("PRAGMA busy_timeout = 5000");
	const db = drizzle({ client, schema });
	migrate(db, { migrationsFolder: migrations });
	return db;
}

let current: { db: DB; dir: string } | undefined;

const open = () => {
	current ??= {
		db: openDatabase(env.dataDir, process.env.MIGRATIONS_DIR ?? "drizzle", process.env.SEED_DIR),
		dir: env.dataDir,
	};
	return current;
};

/** Opened on first use, so prerendering at build time never touches /data. */
export const getDb = () => open().db;

/** Where site.db and images/ live: DATA_DIR, or whatever a test set. */
export const getDataDir = () => open().dir;

/** Tests point the app at a directory and database of their own. */
export const useDatabase = (db: DB, dir: string) => {
	current = { db, dir };
};
