// The partner roster. A static list rather than a table: each row is welded to
// a committed logo file, so adding a partner is a deploy either way — and
// unlike the FAQ, none of this copy is a promise about a child's data that an
// admin might need to correct between releases.
//
// `key` indexes into `partners.list.items` in messages/uk.json, which carries
// the name, the description and the badge.
export type Partner = {
  key: string;
  src: string;
  // The file's own dimensions, so next/image reserves the right box and does
  // not warn. NOT the display size — see `shape`.
  width: number;
  height: number;
  // Kept in the roster but not rendered (Vital, this change). A flag rather
  // than a deleted block: the logo, the copy and the badge stay together and
  // in review, so putting the partner back is one word — and a commented-out
  // object is the kind of thing that rots until nobody dares restore it.
  hidden?: true;
  // How the design sizes the mark. Four of the five are wordmarks laid out to
  // a common 164px width; Newsoft's is a disc, and stretching a disc to a
  // wordmark's width is how a logo gets bent. Two fixed classes rather than a
  // computed width, so Tailwind can see both at build time.
  shape: "wordmark" | "disc";
};

export const PARTNERS: readonly Partner[] = [
  {
    key: "intelliarts",
    src: "/partner-intelliarts.svg",
    width: 163,
    height: 30,
    shape: "wordmark",
  },
  {
    key: "uamade",
    src: "/partner-uamade.webp",
    width: 328,
    height: 84,
    shape: "wordmark",
  },
  {
    key: "dvlGroup",
    src: "/partner-dvl-group.svg",
    width: 143,
    height: 61,
    shape: "wordmark",
    hidden: true,
  },
  {
    key: "newsoft",
    src: "/partner-newsoft.svg",
    width: 92,
    height: 92,
    shape: "disc",
  },
  {
    key: "harwind",
    src: "/partner-harwind.webp",
    width: 328,
    height: 164,
    shape: "wordmark",
  },
];
