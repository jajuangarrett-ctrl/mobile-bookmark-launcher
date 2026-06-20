import { App, PaneType, Plugin, TAbstractFile } from "obsidian";

export type LauncherTab = "recent" | "bookmarks";

export type BookmarkType = "group" | "folder" | "file" | "graph" | "search" | "url";

export interface BookmarkItem {
  ctime?: number;
  type: BookmarkType;
  title?: string;
  items?: BookmarkItem[];
  path?: string;
  subpath?: string;
  query?: string;
  url?: string;
}

type BasicPluginParams = {
  app: App;
  defaultOn: boolean;
  description: string;
  id: string;
  name: string;
  plugin: Plugin;
};

export type BookmarksPluginInstance = BasicPluginParams & {
  items: BookmarkItem[];
  openBookmark: (
    bookmark: BookmarkItem,
    type: PaneType | boolean,
    eState?: { focus: boolean }
  ) => Promise<void>;
};

export type FileExplorerPluginInstance = BasicPluginParams & {
  revealInFolder: (path: TAbstractFile) => void;
};

export type GlobalSearchPluginInstance = BasicPluginParams & {
  openGlobalSearch: (query: string) => void;
};

export type WebViewerPluginInstance = BasicPluginParams & {
  openUrl: (url: string, newLeaf: boolean) => void;
  options?: {
    openExternalURLs?: boolean;
  };
};

export type PluginInstance =
  | BookmarksPluginInstance
  | FileExplorerPluginInstance
  | GlobalSearchPluginInstance
  | WebViewerPluginInstance;

export type CustomApp = App & {
  internalPlugins?: {
    getEnabledPluginById: (pluginId: string) => PluginInstance | null;
  };
};

export interface RecentFileEntry {
  path: string;
  basename: string;
  extension: string;
  timestamp: number;
}
