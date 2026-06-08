// ============================================================
// IPanelModel — manages state of a single file panel
// (Single Responsibility: only state management, no rendering)
// ============================================================

import { FileEntry } from '../types';

export interface IPanelModel {
  /** Current directory path */
  readonly currentPath: string;

  /** Currently selected item index */
  readonly selectedIndex: number;

  /** File entries in current directory */
  readonly entries: ReadonlyArray<FileEntry>;

  /** Get the currently selected entry, if any */
  getSelectedEntry(): FileEntry | undefined;

  /** Navigate to a new directory */
  navigateTo(path: string): Promise<void>;

  /** Select an entry by index (clamped to valid range) */
  selectIndex(index: number): void;

  /** Move selection up by one */
  moveUp(): void;

  /** Move selection down by one */
  moveDown(): void;

  /** Go to parent directory */
  goUp(): Promise<void>;

  /** Enter selected directory or file path */
  goInto(): Promise<boolean>;

  /** Refresh current directory */
  refresh(): Promise<void>;
}