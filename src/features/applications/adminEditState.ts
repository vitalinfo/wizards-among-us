// Result shape for the admin edit form. Outside the "use server" module, which
// may only export async functions.
export type AdminEditState = {
  status: "idle" | "invalid" | "not_found" | "done";
  // Keyed by field name so each input renders its own message.
  errors: Record<string, string>;
};

export const initialAdminEditState: AdminEditState = {
  status: "idle",
  errors: {},
};
