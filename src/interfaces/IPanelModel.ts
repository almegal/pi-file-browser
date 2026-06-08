import { FileEntry } from '../types';

export interface IPanelModel {
  readonly currentPath: string;
  readonly selectedIndex: number;
  readonly entries: ReadonlyArray<FileEntry>;

  getSelectedEntry(): FileEntry | undefined;
  navigateTo(path: string): Promise<void>;
  selectIndex(index: number): void;
  moveUp(): void;
  moveDown(): void;
  goUp(): Promise<void>;
  goInto(): Promise<boolean>;
  refresh(): Promise<void>;
}