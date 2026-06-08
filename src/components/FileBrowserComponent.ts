// ============================================================
// FileBrowserComponent — pi-native TUI component
// (implements Component interface from @earendil-works/pi-tui)
// Single Responsibility: render + input handling for the single-pane file browser
// ============================================================

import type { Component } from '@earendil-works/pi-tui';
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import { IPanelModel } from '../interfaces/IPanelModel';
import { IInputHandler } from '../interfaces/IInputHandler';
import { Direction, Action, FileEntry } from '../types';

export class FileBrowserComponent implements Component {
  // Render cache
  private cachedLines: string[] = [];
  private cachedWidth = 0;
  private version = 0;
  private cachedVersion = -1;

  constructor(
    private readonly panel: IPanelModel,
    private readonly inputHandler: IInputHandler,
    private readonly tui: { requestRender: () => void },
    private readonly onClose: () => void,
  ) {}

  // ---- Component interface ----

  handleInput(data: string): void {
    const input = this.inputHandler.handleKey(data);
    if (input === null) return;

    if (input === Direction.Up) {
      this.panel.moveUp();
    } else if (input === Direction.Down) {
      this.panel.moveDown();
    } else if (input === Direction.Left) {
      this.panel.goUp().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return;
    } else if (input === Direction.Right) {
      this.panel.goInto().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return;
    } else if (input === Action.Enter) {
      this.panel.goInto().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return;
    } else if (input === Action.Escape) {
      this.onClose();
      return;
    }
    // Tab is ignored in single-pane mode

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

    // Path header
    lines.push(this.renderPathHeader(this.panel.currentPath, width));

    // Separator under header
    lines.push('─'.repeat(width));

    // File entries
    const maxEntries = this.getMaxEntries();
    const entries = this.renderPanelEntries(
      this.panel.entries,
      this.panel.selectedIndex,
      width,
      maxEntries,
    );

    for (let i = 0; i < maxEntries; i++) {
      lines.push(entries[i] ?? ''.padEnd(width));
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

  private renderPathHeader(path: string, panelWidth: number): string {
    const label = ` ${path} `;
    const header = truncateToWidth(label, panelWidth).padEnd(panelWidth);
    return `\x1b[1m${header}\x1b[22m`;
  }

  private getMaxEntries(): number {
    return 30;
  }

  private renderPanelEntries(
    entries: ReadonlyArray<FileEntry>,
    selectedIndex: number,
    panelWidth: number,
    maxVisible: number,
  ): string[] {
    const lines: string[] = [];

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

      let entryText = ` ${icon} ${entry.name}${suffix}`;

      entryText = truncateToWidth(entryText, panelWidth);
      const entryVisibleWidth = visibleWidth(entryText);
      const padding = Math.max(0, panelWidth - entryVisibleWidth);
      entryText += ' '.repeat(padding);

      if (isSelected) {
        entryText = `\x1b[7m${entryText}\x1b[27m`;
      } else if (entry.isDirectory) {
        entryText = `\x1b[1m${entryText}\x1b[22m`;
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
    const selected = this.panel.entries[this.panel.selectedIndex];

    let entryInfo = '(empty)';
    if (selected) {
      const type = selected.isDirectory ? 'DIR' : 'FILE';
      const size = selected.isDirectory ? '' : ` ${formatSize(selected.size)}`;
      entryInfo = `${type} ${selected.name}${size}`;
    }

    return ` \x1b[1m${entryInfo}\x1b[22m ` +
      `\x1b[2m│ ↑↓:Move ←:Back →/Enter:Open Esc:Exit\x1b[22m`;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}