import { afterAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { migrateDatabase, openDatabase } from "../src/lib/server/db";

const dir = mkdtempSync(`${tmpdir()}/site-db-`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("creates a migrated WAL database, and reopens it", () => {
	const db = openDatabase(dir);
	migrateDatabase(db);
	const mode = db.$client.query("PRAGMA journal_mode").get() as { journal_mode: string };
	expect(mode.journal_mode).toBe("wal");
	const tables = (
		db.$client.query("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
			name: string;
		}[]
	).map((row) => row.name);
	for (const name of ["project", "post", "guide", "image", "github_app", "user", "oauth_client"]) {
		expect(tables).toContain(name);
	}
	db.$client.close();
	const again = openDatabase(dir);
	expect(() => migrateDatabase(again)).not.toThrow();
	again.$client.close();
});
