import { IconBase, type IconProps } from "./IconBase";

// Signing out — the arrow leaving a doorway the design puts in the account
// header's round button.
//
// Pointing RIGHT, out of the frame. The mirrored version (arrow entering) is
// the convention for signing IN, and the two are easy to draw the wrong way
// round: the bracket is the thing you are leaving, so the arrow moves away
// from it.
export function SignOutIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* The doorway: open on the side the arrow leaves through. */}
      <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="M17 8l4 4-4 4" />
      <path d="M21 12H10" />
    </IconBase>
  );
}
