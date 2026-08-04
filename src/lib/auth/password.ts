import { constantTimeEqual, fromBase64Url, toBase64Url } from "./encoding";

// Admin password hashing with PBKDF2-HMAC-SHA256 via Web Crypto. Chosen because
// it runs on the Cloudflare Workers runtime (argon2/bcrypt native addons don't).
// Stored format: pbkdf2$<iterations>$<saltB64url>$<hashB64url>.
const ITERATIONS = 210_000; // OWASP-recommended floor for PBKDF2-SHA256
const KEY_BYTES = 32;
const SALT_BYTES = 16;

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>, // ArrayBuffer-backed → satisfies Web Crypto BufferSource
  iterations: number,
  bytes: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    bytes * 8,
  );
  return new Uint8Array(derived);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, ITERATIONS, KEY_BYTES);
  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    return false;
  }
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) {
    return false;
  }
  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }
  const actual = await deriveBits(password, salt, iterations, expected.length);
  return constantTimeEqual(actual, expected);
}
