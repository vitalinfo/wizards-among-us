"use client";

import { StepsSection, type Step } from "./StepsSection";

const STEPS: readonly Step[] = [
  { key: "choose", emoji: "✍️" },
  { key: "meet", emoji: "🙏" },
  // Singled out in solid blue here, where the yellow one sits on the families
  // band: the same moment, seen from the other side.
  { key: "help", emoji: "🪄", tone: "primary" },
  { key: "receive", emoji: "❤️" },
];

export function ForVolunteers() {
  return (
    <StepsSection
      id="for-volunteers"
      namespace="volunteers"
      steps={STEPS}
      columns="lg:grid-cols-2 xl:grid-cols-4"
      className="bg-canvas"
    />
  );
}
