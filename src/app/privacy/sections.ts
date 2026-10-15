// The policy's sections, in the order the document numbers them.
//
// Its own module, not a const inside page.tsx, so a spec can check it against
// messages/uk.json without importing the page (which would pull next/headers
// into the test). A renamed or dropped key here silently removes a section
// from a legal document, and nothing else would notice: next-intl throws on a
// missing key, but only for the key that is asked for, never for the one that
// stopped being asked for.
export const POLICY_SECTIONS = [
  "general",
  "data",
  "purpose",
  "access",
  "telegram",
  "photos",
  "sharing",
  "storage",
  "cookies",
  "transfer",
  "rights",
  "children",
  "links",
  "changes",
  "contact",
] as const;

// The block vocabulary the policy text is written in. The renderer supplies a
// component for each; a tag outside this set would reach the page as literal
// angle brackets in a legal document, so the spec pins the list.
export const POLICY_TAGS = ["p", "h3", "ul", "li", "b", "br", "mail"] as const;
