// Secrets at rest (the GitHub App's private key and secrets) are sealed with
// AES-256-GCM under a key derived from AUTH_SECRET, so the database file alone
// doesn't hand them out. Rotating AUTH_SECRET means creating the app again.
import { env } from "./env";

const encoder = new TextEncoder();

async function keyFor(secret: string) {
	const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, [
		"deriveKey",
	]);
	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: encoder.encode("orochibraru"),
			info: encoder.encode("sealed-secrets"),
		},
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

/** "v1.<iv>.<ciphertext>", both base64url. */
export async function seal(plaintext: string, secret = env.authSecret): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await keyFor(secret),
		encoder.encode(plaintext),
	);
	return `v1.${Buffer.from(iv).toString("base64url")}.${Buffer.from(data).toString("base64url")}`;
}

export async function open(sealed: string, secret = env.authSecret): Promise<string> {
	const [version, iv, data] = sealed.split(".");
	if (version !== "v1" || !iv || !data) {
		throw new Error("not a sealed secret");
	}
	const plain = await crypto.subtle
		.decrypt(
			{ name: "AES-GCM", iv: Buffer.from(iv, "base64url") },
			await keyFor(secret),
			Buffer.from(data, "base64url"),
		)
		.catch(() => {
			throw new Error("can't open a sealed secret: was AUTH_SECRET changed?");
		});
	return new TextDecoder().decode(plain);
}
