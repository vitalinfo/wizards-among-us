import { type Actor, isUser } from "@/lib/actor";
import { loginPathFor } from "@/lib/auth/returnPath";

// Where the two manifesto calls to action land a signed-in person. The hero
// buttons still open the public explainers — someone who has just arrived has
// read nothing yet. By the manifesto they have read a whole band of steps, so
// «Подати заявку» / «Стати Чарівником» mean the action, not another page about
// it.
//
// Both destinations guard themselves and handle their own edge cases: a parent
// who has applied already sees their anketas there instead of being pushed
// into a second one, and a user who has not opted into the volunteer role is
// forwarded from the browse list to /account/volunteer, where the opt-in
// button is.
const PARENT_CABINET = "/account/parent/applications";
const VOLUNTEER_CABINET = "/account/volunteer/children";

export type ManifestoHrefs = { families: string; volunteers: string };

// Pure, and separate from the page, because this is the whole of the decision
// and the page around it needs a database to render.
//
// loginPathFor, NOT signedOutRedirect — the same call «Батькам» makes. The two
// answer different questions: the guard asks "you cannot be here, where do you
// belong?" and sends an admin to /admin, which is right for a page an admin
// has no business on. This is a call to action on a public page, and
// teleporting someone into the admin panel from a button reading «Подати
// заявку» explains nothing. /login does explain it — it carries the notice
// that signing in through Telegram would end their admin session.
export function manifestoHrefs(actor: Actor | null): ManifestoHrefs {
  const signedIn = isUser(actor);
  return {
    families: signedIn ? PARENT_CABINET : loginPathFor(PARENT_CABINET),
    volunteers: signedIn ? VOLUNTEER_CABINET : loginPathFor(VOLUNTEER_CABINET),
  };
}
