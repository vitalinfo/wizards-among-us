import { z } from "zod";

import {
  APPLICATION_STATUSES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  FILE_KINDS,
  UKRAINE_REGIONS,
  USER_ROLES,
} from "@/db/enums";

// zod mirrors of the DB enum arrays, in their own module so feature schemas can
// import them without depending on lib/validation.ts — which re-exports the
// feature schemas and would otherwise form a cycle. (src/db/enums.ts stays pure
// with no zod import, so schema.ts and validation both derive from one source.)
export const userRoleSchema = z.enum(USER_ROLES);
export const campaignTypeSchema = z.enum(CAMPAIGN_TYPES);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export const fileKindSchema = z.enum(FILE_KINDS);
export const regionSchema = z.enum(UKRAINE_REGIONS);
