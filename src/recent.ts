import type { RecentFileEntry } from "./types";

const NOTE_EXTENSIONS = new Set(["md", "canvas"]);

export function isRecentNoteExtension(extension: string): boolean {
  return NOTE_EXTENSIONS.has(extension.toLowerCase());
}

export function addRecentFile(
  existing: RecentFileEntry[],
  file: Omit<RecentFileEntry, "timestamp">,
  maxItems: number,
  now = Date.now()
): RecentFileEntry[] {
  const normalizedMax = Math.max(1, Math.floor(maxItems));
  const next: RecentFileEntry = {
    ...file,
    extension: file.extension.toLowerCase(),
    timestamp: now
  };

  return [next, ...existing.filter((entry) => entry.path !== file.path)].slice(
    0,
    normalizedMax
  );
}

export function filterExistingRecentFiles(
  recentFiles: RecentFileEntry[],
  existingPaths: Set<string>
): RecentFileEntry[] {
  return recentFiles.filter((entry) => existingPaths.has(entry.path));
}

export function filterRecentFiles(
  recentFiles: RecentFileEntry[],
  query: string
): RecentFileEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return recentFiles;
  return recentFiles.filter((entry) =>
    `${entry.basename} ${entry.path}`.toLowerCase().includes(normalized)
  );
}
