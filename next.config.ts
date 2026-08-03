import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl wires request-scoped locale + messages via ./src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep the app portable: standard Next.js output that runs on any Node host.
  // Cloudflare is added as a thin deploy layer (see open-next.config.ts /
  // wrangler.jsonc), not baked into app code.
  images: {
    // No image optimizer wired yet (sharp is disabled; the Workers image
    // pipeline isn't configured). Serve originals until we set one up.
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
