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
