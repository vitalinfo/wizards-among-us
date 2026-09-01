import { z } from "zod";

import {
  APPLICATION_STATUSES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  CONTACT_METHODS,
  CREATABLE_CAMPAIGN_TYPES,
  DISPLACED_FROM_REGIONS,
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
// Creating is restricted to what we currently offer; EDITING an existing
// campaign must still accept its historical type, or the archived
// `new_school_year` campaign becomes uneditable.
export const creatableCampaignTypeSchema = z.enum(CREATABLE_CAMPAIGN_TYPES);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export const fileKindSchema = z.enum(FILE_KINDS);
export const regionSchema = z.enum(UKRAINE_REGIONS);
// Where a family was displaced FROM is narrower than where they live now. Same
// create-narrow / edit-wide split as the campaign types above: the parent form
// only offers the occupied and front-line oblasts, while an admin editing an
// existing application still gets `regionSchema`, so an application recorded
// before this narrowed (or an exception an admin has to enter by hand) stays
// editable instead of becoming unsaveable.
export const displacedFromRegionSchema = z.enum(DISPLACED_FROM_REGIONS);
export const contactMethodSchema = z.enum(CONTACT_METHODS);
