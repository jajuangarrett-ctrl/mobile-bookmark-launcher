import { describe, expect, it } from "vitest";
import {
  addRecentFile,
  filterExistingRecentFiles,
  filterRecentFiles,
  isRecentNoteExtension
} from "./recent";

describe("recent note helpers", () => {
  it("recognizes note-like extensions", () => {
    expect(isRecentNoteExtension("md")).toBe(true);
    expect(isRecentNoteExtension("canvas")).toBe(true);
    expect(isRecentNoteExtension("pdf")).toBe(false);
  });

  it("adds a new file to the top", () => {
    const recent = addRecentFile(
      [],
      { path: "A.md", basename: "A", extension: "md" },
      10,
      100
    );

    expect(recent).toEqual([
      { path: "A.md", basename: "A", extension: "md", timestamp: 100 }
    ]);
  });

  it("dedupes reopened files", () => {
    const existing = [
      { path: "A.md", basename: "A", extension: "md", timestamp: 100 },
      { path: "B.md", basename: "B", extension: "md", timestamp: 90 }
    ];

    const recent = addRecentFile(
      existing,
      { path: "B.md", basename: "B", extension: "md" },
      10,
      200
    );

    expect(recent.map((entry) => entry.path)).toEqual(["B.md", "A.md"]);
    expect(recent[0].timestamp).toBe(200);
  });

  it("enforces max count", () => {
    const recent = addRecentFile(
      [
        { path: "A.md", basename: "A", extension: "md", timestamp: 100 },
        { path: "B.md", basename: "B", extension: "md", timestamp: 90 }
      ],
      { path: "C.md", basename: "C", extension: "md" },
      2,
      200
    );

    expect(recent.map((entry) => entry.path)).toEqual(["C.md", "A.md"]);
  });

  it("filters missing files", () => {
    const recent = filterExistingRecentFiles(
      [
        { path: "A.md", basename: "A", extension: "md", timestamp: 100 },
        { path: "Missing.md", basename: "Missing", extension: "md", timestamp: 90 }
      ],
      new Set(["A.md"])
    );

    expect(recent.map((entry) => entry.path)).toEqual(["A.md"]);
  });

  it("filters by basename and path", () => {
    const recent = filterRecentFiles(
      [
        { path: "Projects/A.md", basename: "A", extension: "md", timestamp: 100 },
        { path: "People/Franklin.md", basename: "Franklin", extension: "md", timestamp: 90 }
      ],
      "people"
    );

    expect(recent.map((entry) => entry.path)).toEqual(["People/Franklin.md"]);
  });
});
