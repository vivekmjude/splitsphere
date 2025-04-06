import { expect, test, describe } from "bun:test";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

describe("Utils", () => {
  describe("cn", () => {
    test("should merge tailwind classes correctly", () => {
      expect(cn("text-red-500", "bg-blue-500")).toBe(
        "text-red-500 bg-blue-500"
      );
      expect(cn("p-4", null, undefined, "m-2")).toBe("p-4 m-2");
      expect(cn("p-4", false && "hidden")).toBe("p-4");
      expect(cn("p-4", true && "flex")).toBe("p-4 flex");
    });
  });

  describe("formatDate", () => {
    test("should format date string correctly", () => {
      const dateStr = "2023-05-15T12:00:00.000Z";
      expect(formatDate(dateStr)).toBe("15-May-2023");
    });

    test("should format Date object correctly", () => {
      const date = new Date(2023, 0, 10); // Jan 10, 2023
      expect(formatDate(date)).toBe("10-Jan-2023");
    });
  });

  describe("formatCurrency", () => {
    test("should format USD currency correctly", () => {
      expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
      expect(formatCurrency(0, "USD")).toBe("$0.00");
      expect(formatCurrency(-100, "USD")).toBe("-$100.00");
    });

    test("should format EUR currency correctly", () => {
      expect(formatCurrency(1234.56, "EUR")).toBe("€1,234.56");
    });

    test("should format GBP currency correctly", () => {
      expect(formatCurrency(1234.56, "GBP")).toBe("£1,234.56");
    });
  });
});
