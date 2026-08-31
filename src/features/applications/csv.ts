// CSV serialization for the admin export.
//
// Pure and dependency-free so it can be unit-tested: the export route only
// fetches rows and hands them here.

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

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  // CRLF per RFC 4180 — Excel is the target reader.
  return lines.join("\r\n");
}

// Excel on Windows assumes the system codepage unless a UTF-8 byte-order mark
// says otherwise, and every value in this file is Ukrainian. Without it the
// names arrive as mojibake.
export const UTF8_BOM = "﻿";
