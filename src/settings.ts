import { App, PluginSettingTab, Setting } from "obsidian";
import type MobileBookmarkLauncherPlugin from "../main";
import type { LauncherTab } from "./types";

export interface MobileBookmarkLauncherSettings {
  defaultTab: LauncherTab;
  maxRecentFiles: number;
  showPaths: boolean;
  openInNewTab: boolean;
}

export const DEFAULT_SETTINGS: MobileBookmarkLauncherSettings = {
  defaultTab: "bookmarks",
  maxRecentFiles: 30,
  showPaths: true,
  openInNewTab: true
};

export class MobileBookmarkLauncherSettingTab extends PluginSettingTab {
  plugin: MobileBookmarkLauncherPlugin;

  constructor(app: App, plugin: MobileBookmarkLauncherPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Mobile Bookmark Launcher" });

    new Setting(containerEl)
      .setName("Default tab")
      .setDesc("Tab shown first when the launcher opens.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("bookmarks", "Bookmarks")
          .addOption("recent", "Recent Notes")
          .addOption("folders", "Folder Search")
          .setValue(this.plugin.settings.defaultTab)
          .onChange(async (value) => {
            this.plugin.settings.defaultTab = value as LauncherTab;
            await this.plugin.savePluginData();
          })
      );

    new Setting(containerEl)
      .setName("Max recent notes")
      .setDesc("How many recently opened notes to keep.")
      .addText((text) => {
        text.inputEl.type = "number";
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.maxRecentFiles))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.maxRecentFiles = Number.isFinite(parsed)
              ? Math.max(1, parsed)
              : DEFAULT_SETTINGS.maxRecentFiles;
            this.plugin.recentFiles = this.plugin.recentFiles.slice(
              0,
              this.plugin.settings.maxRecentFiles
            );
            await this.plugin.savePluginData();
          });
      });

    new Setting(containerEl)
      .setName("Show paths")
      .setDesc("Show folder paths under launcher item names.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showPaths).onChange(async (value) => {
          this.plugin.settings.showPaths = value;
          await this.plugin.savePluginData();
        })
      );

    new Setting(containerEl)
      .setName("Open in new tab")
      .setDesc("Open selected notes and files in a new tab.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.openInNewTab).onChange(async (value) => {
          this.plugin.settings.openInNewTab = value;
          await this.plugin.savePluginData();
        })
      );
  }
}
