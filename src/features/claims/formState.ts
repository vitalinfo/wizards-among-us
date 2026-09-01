// Result shape for the volunteer forms. Outside the "use server" module, which
// may only export async functions (the same trap as the other formState files).
export type VolunteerActionState = { status: "idle" | "invalid" };

export const initialVolunteerActionState: VolunteerActionState = {
  status: "idle",
};
