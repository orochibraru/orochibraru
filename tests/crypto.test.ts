import { expect, test } from "bun:test";
import { open, seal } from "../src/lib/server/crypto";

test("seals and opens, differently each time", async () => {
	const a = await seal("the app's private key", "s1");
	const b = await seal("the app's private key", "s1");
	expect(a).not.toBe(b);
	expect(a).not.toContain("private");
	expect(await open(a, "s1")).toBe("the app's private key");
});

test("a different AUTH_SECRET can't open it", async () => {
	const sealed = await seal("x", "s1");
	await expect(open(sealed, "s2")).rejects.toThrow(/AUTH_SECRET/);
});
