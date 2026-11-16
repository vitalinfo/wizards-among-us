// CSV serialization for the admin export.
//
// Pure and dependency-free so it can be unit-tested: the export route only
// fetches rows and hands them here.

import { timeZone } from "@/i18n/config";

// A leading =, +, -, @ (or the tab/CR that some parsers strip before looking)
// makes Excel and Google Sheets treat the cell as a FORMULA. A parent's family
// story or a gift description is free text, so a cell can start with any of
// these — sometimes innocently ("-2 роки тому…"), sometimes not. Prefixing with
// an apostrophe forces the value to be read as text.
//
// This matters more here than in most exports: the file describes displaced
// children, and it will be opened by a volunteer coordinator on a laptop.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const safe = FORMULA_START.test(raw) ? `'${raw}` : raw;
  // Quote whenever the value could otherwise break the row apart. Embedded
  // quotes are doubled, per RFC 4180.
  return /["\n\r,;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

// The caller builds a CSV from two parallel lists — the column names and the
// values each row maps to — and nothing but care keeps them the same length.
// Edit one side only and every value after the missing column shifts by one:
// a current town under «home_town», a phone number under «family_story». The
// file still opens, still looks plausible, and describes the wrong families.
// So a row that does not match the header count is refused rather than written.
//
// It throws, and a failed download is the right outcome: this export is the
// most dangerous artifact the system produces, and a misaligned one is worse
// than none. It can only fire if the code is wrong, never because of the data.
//
// NOT enforced in the type system, though it nearly can be: typing rows as
// `readonly { [K in keyof H]: unknown }[]` over a tuple of headers does check
// the width — but only while the row literal is contextually typed by this
// call, so it evaporates the moment someone hoists the `.map(…)` into a
// variable, which is exactly how the one caller is written. A guard that
// disappears under an innocuous refactor is worse than one that always runs.
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const [index, row] of rows.entries()) {
    if (row.length !== headers.length) {
      throw new Error(
        `csv row ${index} has ${row.length} values for ${headers.length} columns`,
      );
    }
    lines.push(row.map(csvCell).join(","));
  }
  // CRLF per RFC 4180 — Excel is the target reader.
  return lines.join("\r\n");
}

// A moment as the app's pages show it — in its one time zone (Europe/Kyiv) —
// written `2026-11-03 10:33:41`: with the seconds a page leaves out, and still
// sorting as text. h23, or midnight comes out as «24». The server runs in UTC,
// so a Date written as-is would read two or three hours off what an admin saw.
const appTime = new Intl.DateTimeFormat("en-GB", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function csvTime(date: Date): string {
  const part = Object.fromEntries(
    appTime.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second}`;
}

// Excel on Windows assumes the system codepage unless a UTF-8 byte-order mark
// says otherwise, and every value in this file is Ukrainian. Without it the
// names arrive as mojibake.
export const UTF8_BOM = "﻿";
