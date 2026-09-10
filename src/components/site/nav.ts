// The site nav, in the design's order — one list, because the header and the
// footer show the same items and had already drifted apart once (the footer
// was still missing «Ініціативи» and «Партнерам» after the header gained them).
//
// «Ініціативи» is a section of the redesigned landing page, which is not built
// yet, so it is an anchor like «Про нас» already is. An anchor to an id that
// does not exist quietly does nothing, and starts working the moment the
// section lands.
//
// «Партнерам» is a PAGE, not a section (Vital) — the contacts page's third
// card points at it too. It does not exist yet either, but the failure mode of
// a missing route differs from a missing anchor: this one lands on our 404,
// which is a designed page in Ukrainian rather than a dead click.
//
// «Контакти» is deliberately NOT here: the header puts it on the far right,
// away from the others, and the footer makes it a column heading rather than a
// menu entry.
export const SITE_NAV = [
  { key: "about", href: "/#about" },
  { key: "parents", href: "/parent" },
  { key: "volunteers", href: "/volunteer" },
  { key: "initiatives", href: "/#initiatives" },
  { key: "partners", href: "/partners" },
] as const;
