// ============================================================
// FileBrowserComponent — pi-native TUI component
// (implements Component interface from @earendil-works/pi-tui)
// Single Responsibility: render + input handling for the dual-pane file browser
// ============================================================

import type { Component } from '@earendil-works/pi-tui';
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import { IPanelModel } from '../interfaces/IPanelModel';
import { IInputHandler } from '../interfaces/IInputHandler';
import { Direction, Action, ActivePanel, FileEntry } from '../types';

export class FileBrowserComponent implements Component {
  // Render cache
  private cachedLines: string[] = [];
  private cachedWidth = 0;
  private version = 0;
  private cachedVersion = -1;

  constructor(
    private readonly leftPanel: IPanelModel,
    private readonly rightPanel: IPanelModel,
    private readonly inputHandler: IInputHandler,
    private readonly tui: { requestRender: () => void },
    private readonly onClose: () => void,
    private activePanelId: ActivePanel = ActivePanel.Left,
  ) {}

  get activePanel(): IPanelModel {
    return this.activePanelId === ActivePanel.Left ? this.leftPanel : this.rightPanel;
  }

  get inactivePanel(): IPanelModel {
    return this.activePanelId === ActivePanel.Left ? this.rightPanel : this.leftPanel;
  }

  // ---- Component interface ----

  handleInput(data: string): void {
    const input = this.inputHandler.handleKey(data);
    if (input === null) return;

    if (input === Direction.Up) {
      this.activePanel.moveUp();
    } else if (input === Direction.Down) {
      this.activePanel.moveDown();
    } else if (input === Direction.Left) {
      // Go up to parent directory
      this.activePanel.goUp().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return; // async — render happens in promise
    } else if (input === Direction.Right) {
      this.activePanel.goInto().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return;
    } else if (input === Action.Enter) {
      this.activePanel.goInto().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return;
    } else if (input === Action.Tab) {
      this.activePanelId =
        this.activePanelId === ActivePanel.Left ? ActivePanel.Right : ActivePanel.Left;
    } else if (input === Action.Escape) {
      this.onClose();
      return;
    }

    this.version++;
    this.tui.requestRender();
  }

  invalidate(): void {
    this.cachedWidth = 0;
    this.cachedVersion = -1;
  }

  render(width: number): string[] {
    if (width === this.cachedWidth && this.cachedVersion === this.version) {
      return this.cachedLines;
    }

    const lines: string[] = [];

    // Calculate panel widths
    const separatorWidth = 1;
    const leftWidth = Math.floor((width - separatorWidth) / 2);
    const rightWidth = width - leftWidth - separatorWidth;

    const leftActive = this.activePanelId === ActivePanel.Left;

    // Render path headers
    const leftHeader = this.renderPathHeader(
      this.leftPanel.currentPath,
      leftWidth,
      leftActive,
    );
    const rightHeader = this.renderPathHeader(
      this.rightPanel.currentPath,
      rightWidth,
      !leftActive,
    );
    lines.push(leftHeader + '│' + rightHeader);

    // Separator line under headers
    lines.push('─'.repeat(leftWidth) + '┼' + '─'.repeat(rightWidth));

    // Render file entries
    const maxEntries = this.getMaxEntries();
    const leftEntries = this.renderPanelEntries(
      this.leftPanel.entries,
      this.leftPanel.selectedIndex,
      leftWidth,
      leftActive,
      maxEntries,
    );
    const rightEntries = this.renderPanelEntries(
      this.rightPanel.entries,
      this.rightPanel.selectedIndex,
      rightWidth,
      !leftActive,
      maxEntries,
    );

    for (let i = 0; i < maxEntries; i++) {
      const leftLine = leftEntries[i] ?? ''.padEnd(leftWidth);
      const rightLine = rightEntries[i] ?? ''.padEnd(rightWidth);
      lines.push(leftLine + '│' + rightLine);
    }

    // Status bar
    lines.push('─'.repeat(width));
    lines.push(truncateToWidth(this.renderStatusBar(), width));

    this.cachedLines = lines;
    this.cachedWidth = width;
    this.cachedVersion = this.version;
    return lines;
  }

  // ---- Private rendering helpers ----

  private renderPathHeader(path: string, panelWidth: number, isActive: boolean): string {
    const label = isActive ? ` ${path} ` : ` ${path}`;
    const suffix = isActive ? ' ' : '';
    const header = truncateToWidth(label, panelWidth).padEnd(panelWidth);
    // Active panel gets bold header
    return isActive ? `\x1b[1m${header}\x1b[22m${suffix}` : header;
  }

  private getMaxEntries(): number {
    // Assume we use roughly 20 lines total, leaving room for header, separator, status
    // This is an estimate — pi-tui will handle scrolling
    return 30;
  }

  private renderPanelEntries(
    entries: ReadonlyArray<FileEntry>,
    selectedIndex: number,
    panelWidth: number,
    isActive: boolean,
    maxVisible: number,
  ): string[] {
    const lines: string[] = [];

    // Calculate scroll window to keep selected item visible
    const scrollOffset = this.calculateScrollOffset(entries.length, selectedIndex, maxVisible);

    for (let displayIdx = 0; displayIdx < maxVisible; displayIdx++) {
      const entryIdx = displayIdx + scrollOffset;
      if (entryIdx >= entries.length) {
        lines.push('');
        continue;
      }

      const entry = entries[entryIdx];
      const isSelected = entryIdx === selectedIndex;
      const icon = entry.isDirectory ? '\u{1F4C1}' : '\u{1F4C4}';
      const suffix = entry.isDirectory ? '/' : '';

      // Build entry text (visibleWidth accounts for emoji width)
      let entryText = ` ${icon} ${entry.name}${suffix}`;

      // Truncate to fit panel width
      entryText = truncateToWidth(entryText, panelWidth);
      // Pad with spaces (need to account for ANSI codes)
      const entryVisibleWidth = visibleWidth(entryText);
      const padding = Math.max(0, panelWidth - entryVisibleWidth);
      entryText += ' '.repeat(padding);

      if (isSelected && isActive) {
        // Selected + active: reverse video
        entryText = `\x1b[7m${entryText}\x1b[27m`;
      } else if (isSelected) {
        // Selected + inactive: dim underline
        entryText = `\x1b[4m${entryText}\x1b[24m`;
      } else if (entry.isDirectory) {
        // Directories get bold in active panel
        if (isActive) {
          entryText = `\x1b[1m${entryText}\x1b[22m`;
        }
      }

      lines.push(entryText);
    }

    return lines;
  }

  private calculateScrollOffset(
    totalEntries: number,
    selectedIndex: number,
    maxVisible: number,
  ): number {
    if (totalEntries <= maxVisible) return 0;
    const halfVisible = Math.floor(maxVisible / 2);
    const offset = Math.max(0, selectedIndex - halfVisible);
    const maxOffset = Math.max(0, totalEntries - maxVisible);
    return Math.min(offset, maxOffset);
  }

  private renderStatusBar(): string {
    const selected = this.activePanel.entries[this.activePanel.selectedIndex];
    const panelLabel = this.activePanelId === ActivePanel.Left ? 'LEFT' : 'RIGHT';

    let entryInfo = '(empty)';
    if (selected) {
      const type = selected.isDirectory ? 'DIR' : 'FILE';
      const size = selected.isDirectory ? '' : ` ${formatSize(selected.size)}`;
      entryInfo = `${type} ${selected.name}${size}`;
    }

    return ` \x1b[1m[${panelLabel}]\x1b[22m ${entryInfo} ` +
      `\x1b[2m│ ↑↓:Move ←:Back →/Enter:Open Tab:Switch Esc:Exit\x1b[22m`;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}