import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";

import { csvCell } from "../csv";
import {
  CAMPAIGN_EXPORT_COLUMNS,
  campaignExportCsv,
  type CampaignExportDeps,
  type CampaignExportRow,
} from "../export";

const columns = messages.admin.campaigns.export.columns;

// The real labels, the same ones the route reads.
const deps: CampaignExportDeps = {
  heading: (column) => columns[column],
  statusLabel: (status) => messages.parent.applications.status[status],
  genderLabel: (gender) => messages.genders[gender],
  regionLabel: (region) => messages.regions[region],
  yesNo: (value) =>
    value ? messages.admin.applications.yes : messages.admin.applications.no,
};

function row(
  application: Partial<CampaignExportRow["application"]>,
  rest: Partial<Omit<CampaignExportRow, "application">> = {},
): CampaignExportRow {
  return {
    application: {
      id: "app-1",
      childName: "Коваль Марія",
      childAge: 7,
      childGender: "girl",
      currentRegion: "lviv",
      homeRegion: "donetsk",
      status: "claimed",
      submittedAt: new Date("2026-11-03T08:33:41Z"),
      typeFields: { giftUrls: ["https://shop.test/a"] },
      socialMediaConsent: true,
      ...application,
    } as CampaignExportRow["application"],
    username: "olena_k",
    phone: null,
    claimId: "claim-1",
    ...rest,
  };
}

// One row's cells by heading. No value in these rows holds a comma.
function cells(csv: string): Record<string, string> {
  const [, line] = csv.split("\r\n");
  const values = line.split(",");
  expect(values).toHaveLength(CAMPAIGN_EXPORT_COLUMNS.length);
  return Object.fromEntries(
    CAMPAIGN_EXPORT_COLUMNS.map((column, at) => [column, values[at]]),
  );
}

describe("campaignExportCsv", () => {
  // Every key has a heading — a column added to the list without copy would
  // otherwise head the file as `undefined`.
  // (Quoted like any cell: «Вартість подарунка, грн» holds a comma.)
  it("heads every column in Ukrainian, in column order", () => {
    const [header] = campaignExportCsv([], deps).split("\r\n");
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

  it("writes status, gender, regions and answers in words", () => {
    const c = cells(campaignExportCsv([row({})], deps));
    expect(c.status).toBe(messages.parent.applications.status.claimed);
    expect(c.child_gender).toBe(messages.genders.girl);
    expect(c.current_region).toBe(messages.regions.lviv);
    expect(c.home_region).toBe(messages.regions.donetsk);
    expect(c.claimed).toBe(messages.admin.applications.yes);
    expect(c.social_media_consent).toBe(messages.admin.applications.yes);
  });

  // The page shows Kyiv time; the server runs in UTC.
  it("writes the submission in Kyiv time", () => {
    expect(cells(campaignExportCsv([row({})], deps)).submitted_at).toBe(
      "2026-11-03 10:33:41",
    );
  });

  // As the queue export: a link opens the chat, and a phone stays a phone.
  it("writes a Telegram contact as a link, a phone as itself", () => {
    expect(cells(campaignExportCsv([row({})], deps)).contact).toBe(
      "https://t.me/olena_k",
    );
    expect(
      cells(
        campaignExportCsv(
          [row({}, { username: null, phone: "+380501234567" })],
          deps,
        ),
      ).contact,
    ).toBe("'+380501234567");
  });

  // An unanswered consent is not a «ні», and a draft has no gender, region or
  // submission yet.
  it("leaves what the parent hasn't given empty", () => {
    const c = cells(
      campaignExportCsv(
        [
          row(
            {
              status: "draft",
              childGender: null,
              currentRegion: null,
              homeRegion: null,
              submittedAt: null,
              socialMediaConsent: null,
            },
            { claimId: null, username: null },
          ),
        ],
        deps,
      ),
    );
    expect(c.status).toBe(messages.parent.applications.status.draft);
    expect(c.child_gender).toBe("");
    expect(c.current_region).toBe("");
    expect(c.home_region).toBe("");
    expect(c.submitted_at).toBe("");
    expect(c.social_media_consent).toBe("");
    expect(c.claimed).toBe(messages.admin.applications.no);
    expect(c.contact).toBe("");
  });
});
