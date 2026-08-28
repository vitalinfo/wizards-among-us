import { z } from "zod";

// Shared, cross-resource zod schemas — reused on the client (inline feedback)
// and the server (the authoritative gate; the server always re-validates).
//
// Per-resource schemas live with their feature
// (e.g. src/features/applications/validation.ts) and are re-exported here so
// existing call sites keep working. The enum mirrors live in ./enumSchemas so
// feature modules can import them without creating a cycle through this file.

// Admin email/password login. Email is normalized (trim + lowercase) so it
// matches the allowlist and the stored row; the min length also applies at
// first-login provisioning (the password entered then becomes the admin's).
export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((email) => email.toLowerCase()),
  password: z.string().min(8),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export {
  applicationStatusSchema,
  campaignStatusSchema,
  campaignTypeSchema,
  fileKindSchema,
  regionSchema,
  userRoleSchema,
} from "./enumSchemas";

export {
  campaignCreateSchema,
  type CampaignCreateInput,
} from "@/features/campaigns/validation";

export {
  applicationDraftSchema,
  applicationSubmitSchema,
  type ApplicationDraftInput,
  type ApplicationSubmitInput,
} from "@/features/applications/validation";
