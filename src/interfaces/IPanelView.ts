// ============================================================
// IPanelView — renders a single panel in the TUI
// (Single Responsibility: only rendering, no business logic)
// ============================================================

import { FileEntry, ActivePanel } from '../types';

export interface IPanelView {
  /** Render entries into the panel */
  render(
    entries: ReadonlyArray<FileEntry>,
    selectedIndex: number,
    currentPath: string,
    isActive: boolean,
  ): void;

  /** Get the panel's blessed box element */
  getElement(): unknown;

  /** Which panel this view represents */
  readonly panelId: ActivePanel;
}