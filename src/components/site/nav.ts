// The site nav, in the design's order — one list, because the header and the
// footer show the same items and had already drifted apart once (the footer
// was still missing «Ініціативи» and «Партнерам» after the header gained them).
//
// «Ініціативи» and «Партнерам» are both PAGES now. «Ініціативи» was an anchor
// to the landing section of the same name until the designer drew it a page of
// its own; «Про нас» is still an anchor, and still the only one here.
//
// «Контакти» is deliberately NOT here: the header puts it on the far right,
// away from the others, and the footer makes it a column heading rather than a
// menu entry.
export const SITE_NAV = [
  { key: "about", href: "/#about" },
  { key: "parents", href: "/parent" },
  { key: "volunteers", href: "/volunteer" },
  { key: "initiatives", href: "/initiatives" },
  { key: "partners", href: "/partners" },
] as const;
