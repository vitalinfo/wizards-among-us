import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Thin Cloudflare deploy adapter. App code stays standard Next.js; this file
// (plus wrangler.jsonc) is the only Cloudflare-specific surface. Swapping hosts
// means dropping these files, not refactoring the app (portability, plan §2).
export default defineCloudflareConfig();
