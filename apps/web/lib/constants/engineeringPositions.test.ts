import { describe, it, expect } from "vitest";
import {
  ENGINEERING_POSITIONS,
  TOTAL_ENGINEERING_POSITIONS,
} from "./engineeringPositions";

describe("engineeringPositions catalog", () => {
  it("contains more than 100 engineering positions", () => {
    expect(TOTAL_ENGINEERING_POSITIONS).toBeGreaterThanOrEqual(100);
    expect(ENGINEERING_POSITIONS.length).toBeGreaterThanOrEqual(100);
  });

  it("includes specifically required roles: Graduate Engineer Trainee, Associate Engineer, Software Engineer", () => {
    const titles = ENGINEERING_POSITIONS.map((p) => p.title.toLowerCase());

    expect(titles).toContain("graduate engineer trainee");
    expect(titles).toContain("associate engineer");
    expect(titles).toContain("software engineer");
  });

  it("has valid categories and non-empty titles for every entry", () => {
    for (const pos of ENGINEERING_POSITIONS) {
      expect(pos.title).toBeTruthy();
      expect(pos.title.trim().length).toBeGreaterThan(2);
      expect(pos.category).toBeTruthy();
    }
  });
});
