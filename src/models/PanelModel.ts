// === PanelModel: Panel state (navigation, selection, search filter) ===

import { IPanelModel } from '../interfaces/IPanelModel';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { FileEntry } from '../types';

export class PanelModel implements IPanelModel {
  private _currentPath: string;
  private _selectedIndex: number = 0;
  private _allEntries: FileEntry[] = [];
  private _entries: FileEntry[] = [];
  private _searchQuery: string = '';
  private _showHidden: boolean = false;
  private _navHistory: string[] = []; // stack of entered directory names

  constructor(
    private readonly fsProvider: IFileSystemProvider,
    initialPath: string,
  ) {
    this._currentPath = initialPath;
  }

  get currentPath(): string { return this._currentPath; }
  get selectedIndex(): number { return this._selectedIndex; }
  get entries(): ReadonlyArray<FileEntry> { return this._entries; }
  get searchQuery(): string { return this._searchQuery; }
  get totalEntries(): number { return this._allEntries.length; }
  get showHidden(): boolean { return this._showHidden; }

  getSelectedEntry(): FileEntry | undefined {
    if (this._entries.length === 0) return undefined;
    return this._entries[this._selectedIndex];
  }

  async navigateTo(path: string): Promise<void> {
    const isDir = await this.fsProvider.isDirectory(path);
    if (!isDir) {
      throw new Error(`Not a directory: ${path}`);
    }
    this._currentPath = path;
    this._allEntries = await this.fsProvider.listDirectory(path, { showHidden: this._showHidden });
    this._applyFilter();
  }

  selectIndex(index: number): void {
    const maxIndex = Math.max(0, this._entries.length - 1);
    this._selectedIndex = Math.max(0, Math.min(index, maxIndex));
  }

  moveUp(): void {
    if (this._selectedIndex > 0) this._selectedIndex--;
  }

  moveDown(): void {
    if (this._selectedIndex < this._entries.length - 1) this._selectedIndex++;
  }

  async goUp(): Promise<void> {
    const parentPath = this.fsProvider.getParentPath(this._currentPath);
    if (parentPath !== this._currentPath) {
      const childName = this._navHistory.length > 0
        ? this._navHistory.pop()!
        : this.fsProvider.getBaseName(this._currentPath);
      await this.navigateTo(parentPath);
      // Restore selection to the directory we came from
      const idx = this._entries.findIndex((e) => e.name === childName);
      if (idx >= 0) {
        this._selectedIndex = idx;
      }
    }
  }

  async goInto(): Promise<boolean> {
    if (this._entries.length === 0) return false;
    const selected = this._entries[this._selectedIndex];
    if (!selected) return false;
    if (selected.isDirectory) {
      this._navHistory.push(selected.name);
      this._searchQuery = '';
      await this.navigateTo(selected.path);
      return true;
    }
    return false;
  }

  async refresh(): Promise<void> {
    this._allEntries = await this.fsProvider.listDirectory(this._currentPath, { showHidden: this._showHidden });
    this._applyFilter();
  }

  async toggleHidden(): Promise<void> {
    this._showHidden = !this._showHidden;
    await this.refresh();
  }

  setSearchQuery(query: string): void {
    this._searchQuery = query;
    this._applyFilter();
  }

  clearSearch(): void {
    this._searchQuery = '';
    this._applyFilter();
  }

  private _applyFilter(): void {
    if (this._searchQuery === '') {
      this._entries = [...this._allEntries];
    } else {
      const q = this._searchQuery.toLowerCase();
      this._entries = this._allEntries.filter(
        (e) => e.name.toLowerCase().includes(q),
      );
    }
    this._selectedIndex = Math.min(
      this._selectedIndex,
      Math.max(0, this._entries.length - 1),
    );
  }
}