// The one page gutter, shared by the header, the footer and every landing
// section. Not a component, so it stays a plain (camelCase) module.
//
// GUTTER: 16px on mobile, 24px from sm; from lg it is 5.2% — the design's
// 100px expressed as a FRACTION of its 1920 frame, so it stays proportional
// rather than eating a fifth of a 1024 viewport (a fixed 100px wrapped
// «Про нас» onto two lines below 1170px).
//
// The container is capped at the frame width ITSELF, not at 1920-minus-
// gutters: capping at 1720 and then padding inside centres the container
// first and pads within it, which doubled the gutter to 200px.
//
// It lives in one constant because it did not, for a while: the header and
// the footer each carried their own copy, and a copy is a thing that drifts
// silently — the two layouts stop aligning and nothing fails.
export const SITE_CONTAINER =
  "mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-[5.2%]";
