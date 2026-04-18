import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatRelativeTime,
  formatPoints,
  truncate,
  getInitials,
  capitalize,
} from "@/lib/utils";

describe("formatDate", () => {
  it("should format date correctly", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    const formatted = formatDate(date);
    expect(formatted).toContain("15");
    expect(formatted).toContain("Jan");
    expect(formatted).toContain("2024");
  });

  it("should handle string input", () => {
    const formatted = formatDate("2024-01-15T10:30:00Z");
    expect(formatted).toContain("15");
  });
});

describe("formatRelativeTime", () => {
  it('should return "just now" for recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("should return minutes ago", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("5m ago");
  });

  it("should return hours ago", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("3h ago");
  });

  it("should return days ago", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe("2d ago");
  });
});

describe("formatPoints", () => {
  it("should add + sign for positive numbers", () => {
    expect(formatPoints(10)).toBe("+10");
    expect(formatPoints(0)).toBe("+0");
  });

  it("should keep - sign for negative numbers", () => {
    expect(formatPoints(-5)).toBe("-5");
  });
});

describe("truncate", () => {
  it("should truncate long strings", () => {
    const long = "This is a very long string that needs truncation";
    expect(truncate(long, 20)).toBe("This is a very lo...");
  });

  it("should not truncate short strings", () => {
    const short = "Short";
    expect(truncate(short, 20)).toBe("Short");
  });
});

describe("getInitials", () => {
  it("should return initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Priya Sharma")).toBe("PS");
  });

  it("should handle single name", () => {
    expect(getInitials("John")).toBe("J");
  });

  it("should handle null/undefined", () => {
    expect(getInitials(null)).toBe("??");
    expect(getInitials(undefined)).toBe("??");
  });

  it("should limit to 2 characters", () => {
    expect(getInitials("John Paul Smith")).toBe("JP");
  });
});

describe("capitalize", () => {
  it("should capitalize first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("WORLD")).toBe("World");
  });

  it("should handle empty string", () => {
    expect(capitalize("")).toBe("");
  });
});
