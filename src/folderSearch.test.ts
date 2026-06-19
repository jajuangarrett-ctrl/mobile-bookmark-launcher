import { describe, expect, it } from "vitest";
import {
  filterFilesInFolder,
  filterFoldersByQuery,
  folderContainsFile
} from "./folderSearch";

const files = [
  {
    path: "Projects/App/Plan.md",
    name: "Plan.md",
    basename: "Plan",
    extension: "md"
  },
  {
    path: "Projects/App/Assets/icon.png",
    name: "icon.png",
    basename: "icon",
    extension: "png"
  },
  {
    path: "Projects/Other.md",
    name: "Other.md",
    basename: "Other",
    extension: "md"
  }
];

describe("folder search helpers", () => {
  it("detects files inside a folder tree", () => {
    expect(folderContainsFile("Projects/App", "Projects/App/Plan.md")).toBe(true);
    expect(folderContainsFile("Projects/App", "Projects/App/Assets/icon.png")).toBe(true);
    expect(folderContainsFile("Projects/App", "Projects/Other.md")).toBe(false);
  });

  it("filters folders by path and name", () => {
    const folders = filterFoldersByQuery(
      [
        { path: "Projects/App", name: "App" },
        { path: "People", name: "People" }
      ],
      "proj"
    );

    expect(folders.map((folder) => folder.path)).toEqual(["Projects/App"]);
  });

  it("lists nested files inside the selected folder", () => {
    const visible = filterFilesInFolder(files, "Projects/App", "");

    expect(visible.map((file) => file.path)).toEqual([
      "Projects/App/Assets/icon.png",
      "Projects/App/Plan.md"
    ]);
  });

  it("does not include files outside the selected folder", () => {
    const visible = filterFilesInFolder(files, "Projects/App", "other");

    expect(visible).toHaveLength(0);
  });

  it("filters selected-folder files by query", () => {
    const visible = filterFilesInFolder(files, "Projects/App", "icon");

    expect(visible.map((file) => file.path)).toEqual([
      "Projects/App/Assets/icon.png"
    ]);
  });
});
