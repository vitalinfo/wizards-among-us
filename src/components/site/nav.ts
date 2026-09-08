// The site nav, in the design's order — one list, because the header and the
// footer show the same items and had already drifted apart once (the footer
// was still missing «Ініціативи» and «Партнерам» after the header gained them).
//
// «Ініціативи» and «Партнерам» are sections of the redesigned landing page,
// which is not built yet, so they are anchors like «Про нас» already is. An
// anchor to an id that does not exist quietly does nothing, and starts working
// the moment the section lands.
//
// «Контакти» is deliberately NOT here: the header puts it on the far right,
// away from the others, and the footer makes it a column heading rather than a
// menu entry.
export const SITE_NAV = [
  { key: "about", href: "/#about" },
  { key: "parents", href: "/parent" },
  { key: "volunteers", href: "/volunteer" },
  { key: "initiatives", href: "/#initiatives" },
  { key: "partners", href: "/#partners" },
] as const;
