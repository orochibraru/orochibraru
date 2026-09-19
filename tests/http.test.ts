import { describe, expect, test } from "bun:test";
import { canonical, isCrossSiteForm, withHeaders } from "../src/lib/server/http";

const at = (path: string) => canonical(new URL(path, "https://orochibraru.com"));

describe("canonical", () => {
	test("redirects the forms nginx used to", () => {
		expect(at("/index")).toBe("/");
		expect(at("/index.html")).toBe("/");
		expect(at("/baba.html")).toBe("/baba");
		expect(at("/blog/")).toBe("/blog");
		expect(at("/penombre/docs/index")).toBe("/penombre/docs");
		expect(at("/penombre/docs/index.html")).toBe("/penombre/docs");
	});

	test("keeps the query string", () => {
		expect(at("/blog/?q=1")).toBe("/blog?q=1");
	});

	test("leaves canonical URLs alone", () => {
		expect(at("/")).toBeNull();
		expect(at("/penombre")).toBeNull();
		expect(at("/penombre.md")).toBeNull();
	});
});

describe("withHeaders", () => {
	test("adds the security headers", () => {
		const headers = withHeaders(new Response("x")).headers;
		expect(headers.get("x-content-type-options")).toBe("nosniff");
		expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
		expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
	});

	test("adds a charset to text without one, and only then", () => {
		const md = new Response("—", { headers: { "content-type": "text/markdown" } });
		expect(withHeaders(md).headers.get("content-type")).toBe("text/markdown; charset=utf-8");
		const rss = new Response("", { headers: { "content-type": "application/rss+xml" } });
		expect(withHeaders(rss).headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
		const set = new Response("", { headers: { "content-type": "text/html; charset=utf-8" } });
		expect(withHeaders(set).headers.get("content-type")).toBe("text/html; charset=utf-8");
		const png = new Response("", { headers: { "content-type": "image/png" } });
		expect(withHeaders(png).headers.get("content-type")).toBe("image/png");
	});
});

describe("isCrossSiteForm", () => {
	const post = (path: string, headers: Record<string, string>) => {
		const url = new URL(path, "https://orochibraru.com");
		return isCrossSiteForm(new Request(url, { method: "POST", headers }), url);
	};
	const form = { "content-type": "application/x-www-form-urlencoded" };

	test("blocks form posts from elsewhere, or from nowhere", () => {
		expect(post("/admin/posts/1?/save", { ...form, origin: "https://evil.test" })).toBe(true);
		expect(post("/admin/posts/1?/save", form)).toBe(true);
	});

	test("lets same-origin forms and JSON through", () => {
		expect(post("/admin/posts/1?/save", { ...form, origin: "https://orochibraru.com" })).toBe(
			false,
		);
		expect(post("/mcp", { "content-type": "application/json" })).toBe(false);
	});

	test("lets MCP clients' servers reach the OAuth endpoints", () => {
		expect(post("/api/auth/oauth2/token", form)).toBe(false);
		expect(post("/api/auth/oauth2/register", { "content-type": "text/plain" })).toBe(false);
	});
});
