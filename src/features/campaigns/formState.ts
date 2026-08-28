// Result shape for the campaign admin forms.
//
// Lives OUTSIDE the "use server" module because such a file may only export
// async functions. Exporting this object from actions.ts type-checks and builds,
// then fails at runtime with "A 'use server' file can only export async
// functions, found object" — the same trap as
// features/applications/formState.ts. Keep new action state here.
export type CampaignActionState = { status: "idle" | "invalid" | "done" };

export const initialCampaignActionState: CampaignActionState = {
  status: "idle",
};
