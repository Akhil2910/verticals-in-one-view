import { describe, it, expect } from "vitest";
import { allowedType, DOCUMENT_TYPES, PHOTO_TYPES } from "./files.functions";

describe("allowed upload type", () => {
  it("keeps a type the browser labels correctly", () => {
    expect(allowedType("application/pdf", "report.pdf", DOCUMENT_TYPES)).toBe("application/pdf");
  });
  it("accepts a ZIP from Windows by its extension", () => {
    expect(allowedType("application/x-zip-compressed", "TMDP Research Studies.zip", DOCUMENT_TYPES)).toBe("application/zip");
  });
  it("accepts an unlabelled Office file by its extension", () => {
    expect(allowedType("", "Budget.XLSX", DOCUMENT_TYPES)).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(allowedType("application/octet-stream", "photo.jpeg", PHOTO_TYPES)).toBe("image/jpeg");
  });
  it("refuses formats that aren't on the list", () => {
    expect(allowedType("text/html", "page.html", DOCUMENT_TYPES)).toBeNull();
    expect(allowedType("image/svg+xml", "logo.svg", PHOTO_TYPES)).toBeNull();
    expect(allowedType("application/zip", "archive.zip", PHOTO_TYPES)).toBeNull();
    expect(allowedType("", "README", DOCUMENT_TYPES)).toBeNull();
  });
});
