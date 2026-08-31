// Result shape for the moderation form. Outside the "use server" module,
// because such a file may only export async functions (see
// features/applications/formState.ts — the same trap, twice now).
export type ModerationActionState = {
  status: "idle" | "invalid" | "note_required" | "already_decided" | "done";
};

export const initialModerationState: ModerationActionState = { status: "idle" };
