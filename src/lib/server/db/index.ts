import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { env } from "../env";
import * as schema from "./schema";

export type DB = BunSQLiteDatabase<typeof schema> & { $client: Database };

// Ships next to the binary: the image's WORKDIR, the repo root in development.
const migrationsFolder = join(process.cwd(), "drizzle");

/** Opens (creating if needed) DIR/site.db. Migrating is its own step: see migrateDatabase. */
export function openDatabase(dir: string): DB {
	mkdirSync(join(dir, "images"), { recursive: true });
	const client = new Database(join(dir, "site.db"), { create: true, strict: true });
	client.run("PRAGMA journal_mode = WAL");
	client.run("PRAGMA foreign_keys = ON");
	client.run("PRAGMA busy_timeout = 5000");
	return drizzle({ client, schema });
}

/** Brings the schema up to date. The server does it once, at boot, before taking requests. */
export function migrateDatabase(db: DB) {
	migrate(db, { migrationsFolder });
}

let current: { db: DB; dir: string } | undefined;

const open = () => {
	current ??= { db: openDatabase(env.dataDir), dir: env.dataDir };
	return current;
};

/** Opened on first use, so building never touches DATA_DIR. */
export const getDb = () => open().db;

/** Where site.db and images/ live: DATA_DIR, or whatever a test set. */
export const getDataDir = () => open().dir;

/** Tests point the app at a directory and database of their own. */
export const useDatabase = (db: DB, dir: string) => {
	current = { db, dir };
};
