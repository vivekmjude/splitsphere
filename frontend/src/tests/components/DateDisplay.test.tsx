import { expect, test, describe } from "bun:test";
import { formatDate } from "@/lib/utils";

// Instead of testing the component directly, test the core formatting function
describe("DateDisplay Functionality", () => {
  test("should format date correctly", () => {
    const testDate = "2023-07-15T00:00:00.000Z";
    const formattedDate = formatDate(testDate);

    expect(formattedDate).toBe("15-Jul-2023");
  });

  test("should handle different dates correctly", () => {
    const testDate1 = "2023-07-15T00:00:00.000Z";
    const testDate2 = "2024-01-01T00:00:00.000Z";

    expect(formatDate(testDate1)).toBe("15-Jul-2023");
    expect(formatDate(testDate2)).toBe("01-Jan-2024");
  });
});
