// Result shape for the ban form. Outside the "use server" module for the same
// reason as noteState.ts: a value exported from one arrives as `undefined`.
export type UserBanState = { status: "idle" | "not_found" };

export const initialUserBanState: UserBanState = { status: "idle" };
