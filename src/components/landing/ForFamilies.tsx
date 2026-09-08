"use client";

import { StepsSection, type Step } from "./StepsSection";

const STEPS: readonly Step[] = [
  { key: "tell", emoji: "✍️" },
  { key: "verify", emoji: "📄" },
  // The one the design singles out in yellow: the moment a volunteer appears.
  { key: "found", emoji: "🪄", tone: "accent" },
  { key: "support", emoji: "🎁" },
  { key: "share", emoji: "❤️" },
];

export function ForFamilies() {
  return (
    <StepsSection
      id="for-families"
      namespace="families"
      steps={STEPS}
      columns="lg:grid-cols-3 xl:grid-cols-5"
      className="bg-cream-soft"
    />
  );
}
