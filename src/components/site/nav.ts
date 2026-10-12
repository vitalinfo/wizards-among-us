// The site nav, in the design's order — one list, because the header and the
// footer show the same items and had already drifted apart once (the footer
// was still missing «Ініціативи» and «Партнерам» after the header gained them).
//
// Every entry is a PAGE. «Ініціативи», «Партнерам» and now «Про нас» were
// each an anchor into a landing section until the designer drew them a page
// of their own, and there is no anchor left in this list.
//
// The landing still HAS its «Про нас» section and its id — it is simply no
// longer what the menu points at, the same way «#initiatives» stayed put when
// «Ініціативи» became a page.
//
// «Контакти» is deliberately NOT here: the header puts it on the far right,
// away from the others, and the footer makes it a column heading rather than a
// menu entry.
export const SITE_NAV = [
  { key: "about", href: "/about" },
  { key: "parents", href: "/parent" },
  { key: "volunteers", href: "/volunteer" },
  { key: "initiatives", href: "/initiatives" },
  { key: "partners", href: "/partners" },
] as const;
