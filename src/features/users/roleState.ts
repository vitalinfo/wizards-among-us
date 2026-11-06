import type { UserRole } from "@/db/enums";

// Result shape for the user-roles form. Outside the "use server" module for the
// same reason as noteState.ts: a value exported from one arrives as `undefined`.
export type UserRolesState =
  | { status: "idle" }
  | { status: "not_found" }
  | { status: "locked"; role: UserRole };

export const initialUserRolesState: UserRolesState = { status: "idle" };
