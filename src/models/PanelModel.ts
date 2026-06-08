import { IPanelModel } from '../interfaces/IPanelModel';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { FileEntry } from '../types';

export class PanelModel implements IPanelModel {
  private _currentPath: string;
  private _selectedIndex: number = 0;
  private _entries: FileEntry[] = [];

  constructor(
    private readonly fsProvider: IFileSystemProvider,
    initialPath: string,
  ) {
    this._currentPath = initialPath;
  }

  get currentPath(): string { return this._currentPath; }
  get selectedIndex(): number { return this._selectedIndex; }
  get entries(): ReadonlyArray<FileEntry> { return this._entries; }

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
    this._entries = await this.fsProvider.listDirectory(path);
    this._selectedIndex = 0;
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
      await this.navigateTo(parentPath);
    }
  }

  async goInto(): Promise<boolean> {
    if (this._entries.length === 0) return false;
    const selected = this._entries[this._selectedIndex];
    if (!selected) return false;
    if (selected.isDirectory) {
      await this.navigateTo(selected.path);
      return true;
    }
    return false;
  }

  async refresh(): Promise<void> {
    this._entries = await this.fsProvider.listDirectory(this._currentPath);
    this.selectIndex(this._selectedIndex);
  }
}