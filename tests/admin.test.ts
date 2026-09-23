import { expect, test } from "bun:test";
import { ago, interpolate, statusClass } from "../src/lib/admin";

test("ago picks the coarsest unit that fits", () => {
	const now = Date.UTC(2026, 8, 23, 12);
	expect(ago(new Date(now - 30_000), now)).toBe("just now");
	expect(ago(new Date(now - 3 * 3_600_000), now)).toBe("3 hours ago");
	expect(ago(new Date(now - 86_400_000), now)).toBe("yesterday");
	expect(ago(new Date(now - 40 * 86_400_000), now)).toBe("last month");
});

test("statusClass colours the states that need attention", () => {
	expect(statusClass("published")).toBe("status status-on");
	expect(statusClass("failed")).toBe("status status-bad");
	expect(statusClass("draft")).toBe("status");
});

test("interpolate carries a position between anchors onto the other side", () => {
	expect(interpolate(50, [0, 100, 300], [0, 1000, 1200])).toBe(500);
	expect(interpolate(200, [0, 100, 300], [0, 1000, 1200])).toBe(1100);
	expect(interpolate(-40, [0, 100], [0, 800])).toBe(0);
	expect(interpolate(900, [0, 100], [0, 800])).toBe(800);
});
