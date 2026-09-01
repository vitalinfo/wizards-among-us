import { describe, expect, it } from "vitest";

import { contrastRatio, readColorTokens } from "../contrast";

// WCAG AA: 4.5:1 for normal text, 3:1 for large text (>=24px, or >=18.66px
// bold) and for non-text UI boundaries. The rules file requires this of every
// new colour; this is what actually enforces it, because axe cannot measure
// contrast in jsdom.
const AA_NORMAL = 4.5;
const AA_LARGE = 3;

const tokens = readColorTokens();

function ratio(fg: string, bg: string): number {
  const f = tokens[fg];
  const b = tokens[bg];
  if (!f || !b) {
    throw new Error(`missing token: ${!f ? fg : bg}`);
  }
  return contrastRatio(f, b);
}

describe("colour contrast (WCAG AA)", () => {
  it("reads the real tokens from globals.css", () => {
    // A rename that silently emptied this would make every assertion vacuous.
    expect(Object.keys(tokens).length).toBeGreaterThan(10);
    expect(tokens.background).toBe("#ffffff");
  });

  it.each([
    ["foreground", "background", AA_NORMAL],
    ["foreground", "surface", AA_NORMAL],
    ["body", "surface", AA_NORMAL],
    ["body", "surface-muted", AA_NORMAL],
    ["muted-foreground", "background", AA_NORMAL],
    ["muted-foreground", "surface-muted", AA_NORMAL],
    ["primary", "background", AA_NORMAL],
    ["primary", "surface", AA_NORMAL],
    ["primary-foreground", "primary", AA_NORMAL],
    ["primary-tint-foreground", "primary-tint", AA_NORMAL],
    ["header-foreground", "header", AA_NORMAL],
    ["header-muted", "header", AA_NORMAL],
    // The outline button in the header: large bold text on the dark bar.
    ["header-outline", "header", AA_LARGE],
  ])("%s on %s meets %s:1", (fg, bg, threshold) => {
    const value = ratio(fg, bg);
    expect(
      value,
      `${fg} on ${bg} is ${value.toFixed(2)}:1, needs ${threshold}:1`,
    ).toBeGreaterThanOrEqual(threshold as number);
  });
});
