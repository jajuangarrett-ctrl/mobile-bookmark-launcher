import { Plugin, TFile } from "obsidian";
import { LauncherModal } from "./src/LauncherModal";
import {
  DEFAULT_SETTINGS,
  MobileBookmarkLauncherSettingTab,
  type MobileBookmarkLauncherSettings
} from "./src/settings";
import { addRecentFile, isRecentNoteExtension } from "./src/recent";
import type { RecentFileEntry } from "./src/types";

interface PluginData {
  settings?: Partial<MobileBookmarkLauncherSettings>;
  recentFiles?: RecentFileEntry[];
}

export default class MobileBookmarkLauncherPlugin extends Plugin {
  settings: MobileBookmarkLauncherSettings = DEFAULT_SETTINGS;
  recentFiles: RecentFileEntry[] = [];

  async onload() {
    await this.loadPluginData();

    this.addRibbonIcon("bookmark", "Open launcher", () => {
      new LauncherModal(this.app, this).open();
    });

    this.addCommand({
      id: "open-launcher",
      name: "Open launcher",
      callback: () => new LauncherModal(this.app, this).open()
    });

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof TFile) {
          void this.recordRecentFile(file);
        }
      })
    );

    this.addSettingTab(new MobileBookmarkLauncherSettingTab(this.app, this));
  }

  async loadPluginData() {
    const data = (await this.loadData()) as PluginData | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings ?? {});
    this.recentFiles = Array.isArray(data?.recentFiles) ? data.recentFiles : [];
  }

  async savePluginData() {
    await this.saveData({
      settings: this.settings,
      recentFiles: this.recentFiles
    });
  }

  private async recordRecentFile(file: TFile) {
    if (!isRecentNoteExtension(file.extension)) return;

    this.recentFiles = addRecentFile(
      this.recentFiles,
      {
        path: file.path,
        basename: file.basename,
        extension: file.extension
      },
      this.settings.maxRecentFiles
    );

    await this.savePluginData();
  }
}
