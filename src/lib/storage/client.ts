import { S3Client } from "@aws-sdk/client-s3";

// S3-compatible object storage. Cloudflare R2 today; any S3 store by changing
// credentials (portability is a hard rule — nothing here is R2-specific beyond
// the endpoint and the "auto" region R2 expects).
//
// Cached at module scope like the pg pool: valid because we run a long-lived
// Node process (see src/db/index.ts for why that constrains our hosting).
let client: S3Client | undefined;

export function getStorage(): S3Client {
  if (!client) {
    const endpoint = requireEnv("S3_ENDPOINT");
    client = new S3Client({
      region: process.env.S3_REGION ?? "auto",
      endpoint,
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function storageBucket(): string {
  return requireEnv("S3_BUCKET");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// Object keys are namespaced by application and carry a random id, so a key is
// not guessable from an application id alone. Objects are never served from a
// public URL regardless — every read goes through an authorized route — but a
// guessable key would be one failure away from a leak.
export function fileObjectKey(
  applicationId: string,
  kind: string,
  extension: string,
): string {
  return `applications/${applicationId}/${kind}/${crypto.randomUUID()}${extension}`;
}
