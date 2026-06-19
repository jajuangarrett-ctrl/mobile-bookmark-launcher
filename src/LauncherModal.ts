import { App, Modal, Notice, TFile, TFolder, setIcon } from "obsidian";
import type MobileBookmarkLauncherPlugin from "../main";
import {
  filterExistingRecentFiles,
  filterRecentFiles
} from "./recent";
import {
  filterFilesInFolder,
  filterFoldersByQuery
} from "./folderSearch";
import type {
  BookmarkItem,
  BookmarksPluginInstance,
  CustomApp,
  FileExplorerPluginInstance,
  FileListItem,
  FolderListItem,
  GlobalSearchPluginInstance,
  LauncherTab,
  WebViewerPluginInstance
} from "./types";

type BookmarkLevel = {
  title: string;
  items: BookmarkItem[];
};

const TAB_LABELS: Record<LauncherTab, string> = {
  bookmarks: "Bookmarks",
  recent: "Recent Notes",
  folders: "Folder Search"
};

export class LauncherModal extends Modal {
  private plugin: MobileBookmarkLauncherPlugin;
  private activeTab: LauncherTab;
  private query = "";
  private bodyEl: HTMLElement | null = null;
  private bookmarkStack: BookmarkLevel[] = [];
  private selectedFolder: FolderListItem | null = null;

  constructor(app: App, plugin: MobileBookmarkLauncherPlugin) {
    super(app);
    this.plugin = plugin;
    this.activeTab = plugin.settings.defaultTab;
  }

  onOpen() {
    this.modalEl.addClass("mobile-bookmark-launcher-modal");
    this.renderShell();
  }

  onClose() {
    this.contentEl.empty();
  }

  private renderShell() {
    const { contentEl } = this;
    contentEl.empty();

    const header = contentEl.createDiv({ cls: "mbl-header" });
    header.createEl("h2", { text: "Launcher" });
    this.renderTabs(header);

    const searchWrap = contentEl.createDiv({ cls: "mbl-search-wrap" });
    const searchInput = searchWrap.createEl("input", {
      cls: "mbl-search-input",
      attr: {
        type: "search",
        placeholder: this.getSearchPlaceholder(),
        "aria-label": this.getSearchPlaceholder()
      }
    });
    searchInput.value = this.query;
    searchInput.addEventListener("input", () => {
      this.query = searchInput.value;
      this.renderBody();
    });

    this.bodyEl = contentEl.createDiv({ cls: "mbl-body" });
    this.renderBody();
  }

  private renderTabs(container: HTMLElement) {
    const tabs = container.createDiv({ cls: "mbl-tabs" });
    (Object.keys(TAB_LABELS) as LauncherTab[]).forEach((tab) => {
      const button = tabs.createEl("button", {
        cls: `mbl-tab ${this.activeTab === tab ? "is-active" : ""}`,
        text: TAB_LABELS[tab]
      });
      button.type = "button";
      button.addEventListener("click", () => {
        this.activeTab = tab;
        this.query = "";
        this.renderShell();
      });
    });
  }

  private renderBody() {
    if (!this.bodyEl) return;
    this.bodyEl.empty();

    if (this.activeTab === "bookmarks") {
      this.renderBookmarks(this.bodyEl);
      return;
    }

    if (this.activeTab === "recent") {
      this.renderRecent(this.bodyEl);
      return;
    }

    this.renderFolderSearch(this.bodyEl);
  }

  private renderBookmarks(container: HTMLElement) {
    const bookmarksPlugin = this.getEnabledPlugin<BookmarksPluginInstance>("bookmarks");
    if (!bookmarksPlugin) {
      this.renderEmpty(
        container,
        "Bookmarks are unavailable",
        "Enable Obsidian's core Bookmarks plugin to use this tab."
      );
      return;
    }

    const level = this.bookmarkStack[this.bookmarkStack.length - 1];
    const items = level?.items ?? bookmarksPlugin.items ?? [];

    if (level) {
      this.renderBackRow(container, level.title, () => {
        this.bookmarkStack.pop();
        this.query = "";
        this.renderShell();
      });
    }

    const visibleItems = items.filter((item) =>
      this.bookmarkMatchesQuery(item, this.query)
    );

    if (visibleItems.length === 0) {
      this.renderEmpty(container, "No bookmarks found", "Try a different search.");
      return;
    }

    visibleItems.forEach((item) => {
      this.renderActionRow(container, {
        icon: this.getBookmarkIcon(item),
        title: this.getBookmarkDisplayName(item),
        subtitle: this.getBookmarkSubtitle(item),
        onClick: () => {
          if (item.type === "group") {
            this.bookmarkStack.push({
              title: this.getBookmarkDisplayName(item),
              items: item.items ?? []
            });
            this.query = "";
            this.renderShell();
            return;
          }

          void this.openBookmark(item, bookmarksPlugin);
        }
      });
    });
  }

  private renderRecent(container: HTMLElement) {
    const existingPaths = new Set(this.app.vault.getFiles().map((file) => file.path));
    const existingRecent = filterExistingRecentFiles(
      this.plugin.recentFiles,
      existingPaths
    );

    if (existingRecent.length !== this.plugin.recentFiles.length) {
      this.plugin.recentFiles = existingRecent;
      void this.plugin.savePluginData();
    }

    const visibleFiles = filterRecentFiles(existingRecent, this.query);
    if (visibleFiles.length === 0) {
      this.renderEmpty(
        container,
        "No recent notes yet",
        "Open a few notes and they will appear here."
      );
      return;
    }

    visibleFiles.forEach((entry) => {
      this.renderActionRow(container, {
        icon: entry.extension === "canvas" ? "layout-dashboard" : "file-text",
        title: entry.basename,
        subtitle: this.plugin.settings.showPaths ? entry.path : "",
        onClick: () => void this.openFilePath(entry.path)
      });
    });
  }

  private renderFolderSearch(container: HTMLElement) {
    if (!this.selectedFolder) {
      const folders = filterFoldersByQuery(this.getVaultFolders(), this.query);
      if (folders.length === 0) {
        this.renderEmpty(container, "No folders found", "Try a different folder name.");
        return;
      }

      folders.forEach((folder) => {
        this.renderActionRow(container, {
          icon: "folder-search",
          title: folder.name,
          subtitle: this.plugin.settings.showPaths ? folder.path : "",
          onClick: () => {
            this.selectedFolder = folder;
            this.query = "";
            this.renderShell();
          }
        });
      });
      return;
    }

    this.renderBackRow(container, this.selectedFolder.path, () => {
      this.selectedFolder = null;
      this.query = "";
      this.renderShell();
    });

    const files = filterFilesInFolder(
      this.getVaultFiles(),
      this.selectedFolder.path,
      this.query
    );

    if (files.length === 0) {
      this.renderEmpty(
        container,
        "No files found",
        "This folder has no matching files."
      );
      return;
    }

    files.forEach((file) => {
      this.renderActionRow(container, {
        icon: this.getFileIcon(file.extension),
        title: file.basename || file.name,
        subtitle: this.plugin.settings.showPaths ? file.path : "",
        onClick: () => void this.openFilePath(file.path)
      });
    });
  }

  private renderActionRow(
    container: HTMLElement,
    config: {
      icon: string;
      title: string;
      subtitle?: string;
      onClick: () => void;
    }
  ) {
    const button = container.createEl("button", { cls: "mbl-row" });
    button.type = "button";
    button.addEventListener("click", config.onClick);

    const iconEl = button.createSpan({ cls: "mbl-row-icon" });
    setIcon(iconEl, config.icon);

    const text = button.createDiv({ cls: "mbl-row-text" });
    text.createDiv({ cls: "mbl-row-title", text: config.title || "Untitled" });
    if (config.subtitle) {
      text.createDiv({ cls: "mbl-row-subtitle", text: config.subtitle });
    }
  }

  private renderBackRow(container: HTMLElement, label: string, onBack: () => void) {
    const wrapper = container.createDiv({ cls: "mbl-context-row" });
    const backButton = wrapper.createEl("button", { cls: "mbl-back-button" });
    backButton.type = "button";
    setIcon(backButton.createSpan({ cls: "mbl-back-icon" }), "arrow-left");
    backButton.createSpan({ text: "Back" });
    backButton.addEventListener("click", onBack);
    wrapper.createDiv({ cls: "mbl-context-label", text: label });
  }

  private renderEmpty(container: HTMLElement, title: string, body: string) {
    const empty = container.createDiv({ cls: "mbl-empty" });
    empty.createDiv({ cls: "mbl-empty-title", text: title });
    empty.createDiv({ cls: "mbl-empty-body", text: body });
  }

  private getSearchPlaceholder(): string {
    if (this.activeTab === "bookmarks") return "Search bookmarks";
    if (this.activeTab === "recent") return "Search recent notes";
    if (this.selectedFolder) return "Search files in folder";
    return "Search folders";
  }

  private getVaultFolders(): FolderListItem[] {
    return this.app.vault
      .getAllLoadedFiles()
      .filter((item): item is TFolder => item instanceof TFolder)
      .filter((folder) => folder.path !== "/" && folder.path.length > 0)
      .map((folder) => ({
        path: folder.path,
        name: folder.name || folder.path
      }));
  }

  private getVaultFiles(): FileListItem[] {
    return this.app.vault.getFiles().map((file) => ({
      path: file.path,
      name: file.name,
      basename: file.basename,
      extension: file.extension.toLowerCase()
    }));
  }

  private bookmarkMatchesQuery(item: BookmarkItem, query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return `${this.getBookmarkDisplayName(item)} ${item.path ?? ""} ${item.url ?? ""} ${
      item.query ?? ""
    }`
      .toLowerCase()
      .includes(normalized);
  }

  private getBookmarkDisplayName(item: BookmarkItem): string {
    if (item.title) return item.title;
    if (item.type === "file" && item.path) {
      const file = this.app.vault.getAbstractFileByPath(item.path);
      return file instanceof TFile ? file.basename : item.path;
    }
    if (item.type === "folder" && item.path) {
      return item.path.split("/").pop() || item.path;
    }
    if (item.type === "search") return item.query || "Search";
    if (item.type === "url") return item.url || "URL";
    if (item.type === "graph") return "Graph";
    return "Group";
  }

  private getBookmarkSubtitle(item: BookmarkItem): string {
    if (!this.plugin.settings.showPaths) return "";
    if (item.type === "file" || item.type === "folder") return item.path ?? "";
    if (item.type === "url") return item.url ?? "";
    if (item.type === "search") return item.query ?? "";
    if (item.type === "group") return `${item.items?.length ?? 0} items`;
    return "";
  }

  private getBookmarkIcon(item: BookmarkItem): string {
    if (item.type === "group") return "folder";
    if (item.type === "folder") return "folder-closed";
    if (item.type === "search") return "search";
    if (item.type === "graph") return "git-fork";
    if (item.type === "url") return "globe-2";
    if (item.subpath) return item.subpath.startsWith("#^") ? "toy-brick" : "heading";
    return "file";
  }

  private getFileIcon(extension: string): string {
    if (extension === "md") return "file-text";
    if (extension === "canvas") return "layout-dashboard";
    if (extension === "pdf") return "file";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
      return "image";
    }
    return "file";
  }

  private async openFilePath(path: string) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice("File not found.");
      return;
    }

    await this.app.workspace.getLeaf(this.plugin.settings.openInNewTab).openFile(file);
    this.close();
  }

  private async openBookmark(
    bookmark: BookmarkItem,
    bookmarksPlugin: BookmarksPluginInstance
  ) {
    try {
      switch (bookmark.type) {
        case "file":
          await this.openFileBookmark(bookmark);
          break;
        case "folder":
          await this.openFolderBookmark(bookmark, bookmarksPlugin);
          break;
        case "search":
          await this.openSearchBookmark(bookmark, bookmarksPlugin);
          break;
        case "url":
          this.openUrlBookmark(bookmark);
          break;
        case "graph":
          await bookmarksPlugin.openBookmark(
            bookmark,
            this.plugin.settings.openInNewTab ? "tab" : false,
            { focus: true }
          );
          break;
        case "group":
          return;
      }
      this.close();
    } catch (error) {
      new Notice(`Could not open bookmark: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async openFileBookmark(bookmark: BookmarkItem) {
    const file = this.app.vault.getAbstractFileByPath(bookmark.path ?? "");
    if (!(file instanceof TFile)) {
      new Notice("Bookmarked file not found.");
      return;
    }

    await this.app.workspace
      .getLeaf(this.plugin.settings.openInNewTab)
      .openFile(file, { eState: { subpath: bookmark.subpath } });
  }

  private async openFolderBookmark(
    bookmark: BookmarkItem,
    bookmarksPlugin: BookmarksPluginInstance
  ) {
    const folder = this.app.vault.getAbstractFileByPath(bookmark.path ?? "");
    const fileExplorerPlugin =
      this.getEnabledPlugin<FileExplorerPluginInstance>("file-explorer");

    if (folder instanceof TFolder && fileExplorerPlugin) {
      fileExplorerPlugin.revealInFolder(folder);
      return;
    }

    await bookmarksPlugin.openBookmark(
      bookmark,
      this.plugin.settings.openInNewTab ? "tab" : false,
      { focus: true }
    );
  }

  private async openSearchBookmark(
    bookmark: BookmarkItem,
    bookmarksPlugin: BookmarksPluginInstance
  ) {
    const globalSearchPlugin =
      this.getEnabledPlugin<GlobalSearchPluginInstance>("global-search");

    if (globalSearchPlugin) {
      globalSearchPlugin.openGlobalSearch(bookmark.query ?? "");
      return;
    }

    await bookmarksPlugin.openBookmark(
      bookmark,
      this.plugin.settings.openInNewTab ? "tab" : false,
      { focus: true }
    );
  }

  private openUrlBookmark(bookmark: BookmarkItem) {
    if (!bookmark.url) {
      new Notice("Bookmarked URL is empty.");
      return;
    }

    const webViewerPlugin = this.getEnabledPlugin<WebViewerPluginInstance>("webviewer");
    if (webViewerPlugin?.options?.openExternalURLs) {
      webViewerPlugin.openUrl(bookmark.url, this.plugin.settings.openInNewTab);
      return;
    }

    window.open(bookmark.url, "_blank");
  }

  private getEnabledPlugin<T>(pluginId: string): T | null {
    return (
      ((this.app as CustomApp).internalPlugins?.getEnabledPluginById(pluginId) as T | null) ??
      null
    );
  }
}
