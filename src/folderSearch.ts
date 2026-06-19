import type { FileListItem, FolderListItem } from "./types";

export function folderContainsFile(folderPath: string, filePath: string): boolean {
  const normalizedFolder = normalizeFolderPath(folderPath);
  if (!normalizedFolder) return true;
  return filePath === normalizedFolder || filePath.startsWith(`${normalizedFolder}/`);
}

export function filterFoldersByQuery(
  folders: FolderListItem[],
  query: string
): FolderListItem[] {
  const normalized = query.trim().toLowerCase();
  const sorted = folders.slice().sort((a, b) => a.path.localeCompare(b.path));
  if (!normalized) return sorted;
  return sorted.filter((folder) =>
    `${folder.name} ${folder.path}`.toLowerCase().includes(normalized)
  );
}

export function filterFilesInFolder(
  files: FileListItem[],
  folderPath: string,
  query: string
): FileListItem[] {
  const normalized = query.trim().toLowerCase();
  return files
    .filter((file) => folderContainsFile(folderPath, file.path))
    .filter((file) => {
      if (!normalized) return true;
      return `${file.basename} ${file.name} ${file.path}`.toLowerCase().includes(normalized);
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeFolderPath(path: string): string {
  return path.replace(/\/+$/, "");
}
