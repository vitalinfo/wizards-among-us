import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";

import { csvCell } from "../csv";
import {
  CAMPAIGN_EXPORT_COLUMNS,
  campaignExportCsv,
  type CampaignExportRow,
} from "../export";

const columns = messages.admin.campaigns.export.columns;
const heading = (column: keyof typeof columns) => columns[column];

describe("campaignExportCsv", () => {
  // Every key has a heading — a column added to the list without copy would
  // otherwise head the file as `undefined`.
  // (Quoted like any cell: «Вартість подарунка, грн» holds a comma.)
  it("heads every column in Ukrainian, in column order", () => {
    const [header] = campaignExportCsv([], heading).split("\r\n");
    expect(header).toBe(
      CAMPAIGN_EXPORT_COLUMNS.map((column) => csvCell(columns[column])).join(
        ",",
      ),
    );
    expect(Object.keys(columns)).toEqual([...CAMPAIGN_EXPORT_COLUMNS]);
  });

  // Same words for the same field as the queue export, so a coordinator
  // holding both files reads one vocabulary.
  it("words shared columns as the queue export does", () => {
    const queue = messages.admin.applications.export.columns;
    expect(columns.child_name).toBe(queue.childName);
    expect(columns.current_town).toBe(queue.currentTown);
    expect(columns.delivery_information).toBe(queue.deliveryInformation);
    expect(columns.contact).toBe(queue.contact);
  });

  it("writes one value per heading", () => {
    const row = {
      application: {
        id: "app-1",
        childName: "Коваль Марія",
        childAge: 7,
        typeFields: { giftUrls: ["https://shop.test/a"] },
        socialMediaConsent: true,
      },
      username: "olena_k",
      phone: null,
      claimId: "claim-1",
    } as unknown as CampaignExportRow;

    const [, line] = campaignExportCsv([row], heading).split("\r\n");
    expect(line.split(",")).toHaveLength(CAMPAIGN_EXPORT_COLUMNS.length);
    expect(line).toContain("@olena_k");
  });
});
