import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl wires request-scoped locale + messages via ./src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep the app portable: standard Next.js output that runs on any Node host.
  // Nothing host-specific is baked into app code — swapping hosts is a deploy
  // concern (Procfile + docs), not a code change.
  images: {
    // No image optimizer wired yet (sharp is disabled). Serve originals until we
    // set one up.
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
