import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "../csv";

describe("csvCell", () => {
  it("passes plain values through", () => {
    expect(csvCell("Софійка")).toBe("Софійка");
    expect(csvCell(7)).toBe("7");
  });

  it("renders empty for missing values", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes and escapes anything that would break the row", () => {
    expect(csvCell("Львів, вул. Січових")).toBe('"Львів, вул. Січових"');
    expect(csvCell('каже "дякую"')).toBe('"каже ""дякую"""');
    expect(csvCell("рядок\nінший")).toBe('"рядок\nінший"');
    // Semicolon: some locales open CSV with ; as the delimiter.
    expect(csvCell("а;б")).toBe('"а;б"');
  });

  // A spreadsheet of children's data will be opened in Excel or Sheets, where a
  // leading =, +, - or @ turns free text into an executable formula.
  it("neutralises values a spreadsheet would run as a formula", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("-2 роки тому")).toBe("'-2 роки тому");
    expect(csvCell('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"',
    );
  });

  it("serialises dates unambiguously", () => {
    expect(csvCell(new Date("2026-08-25T12:00:00.000Z"))).toBe(
      "2026-08-25T12:00:00.000Z",
    );
  });
});

describe("toCsv", () => {
  it("writes a header row and CRLF line endings", () => {
    expect(
      toCsv(
        ["ім'я", "вік"],
        [
          ["Софійка", 7],
          ["Данило", 10],
        ],
      ),
    ).toBe("ім'я,вік\r\nСофійка,7\r\nДанило,10");
  });

  it("writes just the header when there are no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });
});
