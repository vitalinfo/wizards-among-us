import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";

import {
  QUEUE_EXPORT_COLUMNS,
  queueExportCsv,
  type QueueExportRow,
} from "../export";

const columns = messages.admin.applications.export.columns;
const regions = messages.regions;

const deps = {
  heading: (column: keyof typeof columns) => columns[column],
  regionLabel: (region: keyof typeof regions) => regions[region],
  photoUrl: (applicationId: string, fileId: string) =>
    `https://example.test/api/applications/${applicationId}/files/${fileId}`,
};

function row(overrides: Partial<QueueExportRow> = {}): QueueExportRow {
  return {
    application: {
      id: "app-1",
      childName: "Коваль Марія",
      childAge: 7,
      homeTown: "Бахмут",
      homeRegion: "donetsk",
      currentTown: "Львів",
      currentRegion: "lviv",
      familyStory: "Виїхали навесні",
      giftDescription: "Конструктор",
      typeFields: { giftUrls: ["https://shop.test/a", "https://shop.test/b"] },
      deliveryInformation: "Нова пошта, відділення 12",
    },
    username: "olena_k",
    phone: "+380501234567",
    photos: [],
    ...overrides,
  };
}

// Parses the CSV back into cells — enough of RFC 4180 for what toCsv writes.
function parse(csv: string): string[][] {
  const rows: string[][] = [[]];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      rows.at(-1)!.push(cell);
      cell = "";
    } else if (char === "\r" && csv[i + 1] === "\n") {
      rows.at(-1)!.push(cell);
      cell = "";
      rows.push([]);
      i++;
    } else {
      cell += char;
    }
  }
  rows.at(-1)!.push(cell);
  return rows;
}

function exported(rows: QueueExportRow[]) {
  const [headings, ...body] = parse(queueExportCsv(rows, deps));
  return body.map((cells) =>
    Object.fromEntries(headings.map((heading, i) => [heading, cells[i]])),
  );
}

describe("queueExportCsv", () => {
  it("writes the coordinators' columns, in their order, in Ukrainian", () => {
    const [headings] = parse(queueExportCsv([], deps));

    expect(headings).toEqual([
      "Прізвище імʼя дитини",
      "Вік",
      "Рідне місто",
      "Рідна область",
      "Місто зараз",
      "Область зараз",
      "Історія родини",
      "Опис подарунка",
      "Посилання на товар",
      "Фото листа",
      "Фото дитини з листом",
      "Куди доставити",
      "Контакт родини",
    ]);
    expect(headings).toHaveLength(QUEUE_EXPORT_COLUMNS.length);
  });

  it("writes one row per application, each value under its own heading", () => {
    const [only] = exported([row()]);

    expect(only).toEqual({
      [columns.childName]: "Коваль Марія",
      [columns.childAge]: "7",
      [columns.homeTown]: "Бахмут",
      [columns.homeRegion]: regions.donetsk,
      [columns.currentTown]: "Львів",
      [columns.currentRegion]: regions.lviv,
      [columns.familyStory]: "Виїхали навесні",
      [columns.giftDescription]: "Конструктор",
      [columns.giftUrls]: "https://shop.test/a\nhttps://shop.test/b",
      [columns.letterPhoto]: "",
      [columns.childWithLetterPhoto]: "",
      [columns.deliveryInformation]: "Нова пошта, відділення 12",
      [columns.contact]: "https://t.me/olena_k",
    });
  });

  it("links the newest letter photo and child photo, never the certificate", () => {
    const [only] = exported([
      row({
        photos: [
          { id: "letter-old", kind: "letter_photo" },
          { id: "cert", kind: "idp_certificate" },
          { id: "child", kind: "child_with_letter_photo" },
          { id: "letter-new", kind: "letter_photo" },
        ],
      }),
    ]);

    expect(only[columns.letterPhoto]).toBe(
      "https://example.test/api/applications/app-1/files/letter-new",
    );
    expect(only[columns.childWithLetterPhoto]).toBe(
      "https://example.test/api/applications/app-1/files/child",
    );
    expect(Object.values(only).join("")).not.toContain("cert");
  });

  it("falls back to the phone, and to nothing, for the family's contact", () => {
    // The apostrophe is the formula guard: unguarded, a spreadsheet reads the
    // number as arithmetic and drops the plus.
    const [byPhone, none] = exported([
      row({ username: null }),
      row({ username: null, phone: null }),
    ]);

    expect(byPhone[columns.contact]).toBe("'+380501234567");
    expect(none[columns.contact]).toBe("");
  });

  it("leaves a draft's empty fields empty", () => {
    const [draft] = exported([
      row({
        application: {
          id: "app-2",
          childName: null,
          childAge: null,
          homeTown: null,
          homeRegion: null,
          currentTown: null,
          currentRegion: null,
          familyStory: null,
          giftDescription: null,
          typeFields: null,
          deliveryInformation: null,
        },
        username: null,
        phone: null,
      }),
    ]);

    expect(Object.values(draft).every((value) => value === "")).toBe(true);
  });

  it("keeps parent-written text from running as a formula", () => {
    const [only] = exported([
      row({
        application: {
          ...row().application,
          familyStory: '=HYPERLINK("http://evil")',
        },
      }),
    ]);

    expect(only[columns.familyStory]).toBe('\'=HYPERLINK("http://evil")');
  });

  it("keeps the order it was given", () => {
    const rows = exported([
      row({ application: { ...row().application, childName: "Перша" } }),
      row({ application: { ...row().application, childName: "Друга" } }),
    ]);

    expect(rows.map((r) => r[columns.childName])).toEqual(["Перша", "Друга"]);
  });
});
