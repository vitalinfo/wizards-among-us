// Portable crypto/encoding helpers built on Web Crypto + base64url, so they run
// on both Node and the Cloudflare Workers runtime (no `node:crypto`, which
// workerd doesn't provide). `crypto` here is the global Web Crypto.

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

// Returns an ArrayBuffer-backed array (not SharedArrayBuffer) so it satisfies
// Web Crypto's `BufferSource` under TS 5.x's generic typed arrays.
export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Constant-time byte comparison (avoids leaking match position via timing).
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// 256-bit random token (base64url) — the opaque value stored in the session cookie.
export function randomToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

// SHA-256 of a string → base64url. We store only a session token's hash, so a
// read-only DB leak can't be replayed as a live session.
export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toBase64Url(new Uint8Array(digest));
}
