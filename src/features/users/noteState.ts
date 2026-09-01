// Result shape for the user-note form. Outside the "use server" module: such a
// file may only export async functions, and a value exported from one arrives
// as `undefined` at runtime (see features/applications/formState.ts — the same
// trap, more than once now).
export type UserNoteState = {
  status: "idle" | "saved" | "too_long" | "not_found";
};

export const initialUserNoteState: UserNoteState = { status: "idle" };

// A coordination note, not a case file. Long enough for the context an admin
// actually needs to hand over, short enough that nobody pastes a family's whole
// history into a column no one is auditing.
export const MAX_USER_NOTE_LENGTH = 1000;
