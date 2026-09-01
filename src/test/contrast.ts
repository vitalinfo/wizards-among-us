import { readFileSync } from "node:fs";
import { join } from "node:path";

// WCAG contrast, computed from the tokens in globals.css.
//
// This exists because axe cannot measure contrast in jsdom (no canvas), so the
// automated a11y checks are blind to it. Reading the real stylesheet means a
// token change that breaks contrast fails CI, rather than being noticed by
// someone squinting at a phone.

export function readColorTokens(): Record<string, string> {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const tokens: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(
    /--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g,
  )) {
    tokens[name] = value;
  }
  return tokens;
}

function channel(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

// Relative luminance, per WCAG 2.1.
function luminance(hex: string): number {
  const [r, g, b] = channel(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}
