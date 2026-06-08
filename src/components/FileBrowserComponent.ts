// ============================================================
// FileBrowserComponent — pi-native TUI component
// (implements Component interface from @earendil-works/pi-tui)
// Supports four modes: browsing, loading, selecting, viewing
// Single Responsibility: render + input handling for the file browser
// ============================================================

import type { Component } from '@earendil-works/pi-tui';
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import { IPanelModel } from '../interfaces/IPanelModel';
import { IInputHandler } from '../interfaces/IInputHandler';
import { Direction, Action, BrowserResult, BrowserMode, SelectionData, DiscoverOptionsFn, FileEntry } from '../types';

// Box-drawing characters for the border
const TL = '\u256D';
const TR = '\u256E';
const BL = '\u2570';
const BR = '\u256F';
const H = '\u2500';
const V = '\u2502';

export class FileBrowserComponent implements Component {
  // Render cache
  private cachedLines: string[] = [];
  private cachedWidth = 0;
  private version = 0;
  private cachedVersion = -1;

  // Mode state
  private mode: BrowserMode = 'browsing';
  private selectionData: SelectionData | null = null;
  private selectionIndex: number = 0;

  // Viewing mode state
  private viewingFilePath: string = '';
  private viewingFileName: string = '';
  private viewingLines: string[] = [];
  private viewingScrollOffset: number = 0;
  private static readonly MAX_VIEW_SIZE = 512 * 1024; // 512 KB

  // Result callback and async discovery
  private readonly done: (result: BrowserResult) => void;
  private readonly discoverOptions: DiscoverOptionsFn;
  private readonly readFile: (path: string) => Promise<string>;

  constructor(
    private readonly panel: IPanelModel,
    private readonly inputHandler: IInputHandler,
    private readonly tui: { requestRender: () => void },
    done: (result: BrowserResult) => void,
    discoverOptions: DiscoverOptionsFn,
    readFile: (path: string) => Promise<string>,
  ) {
    this.done = done;
    this.discoverOptions = discoverOptions;
    this.readFile = readFile;
  }

  // ---- Component interface ----

  handleInput(data: string): void {
    const input = this.inputHandler.handleKey(data);
    if (input === null) return;

    // In loading mode, ignore all input
    if (this.mode === 'loading') return;

    // In viewing mode, handle scrolling and exit
    if (this.mode === 'viewing') {
      this.handleViewingInput(input);
      this.version++;
      this.tui.requestRender();
      return;
    }

    // In selecting mode, handle option navigation
    if (this.mode === 'selecting') {
      this.handleSelectingInput(input);
      this.version++;
      this.tui.requestRender();
      return;
    }

    // In browsing mode, handle as before
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
      // Right arrow: browse into directory (navigational)
      this.panel.goInto().then(() => {
        this.version++;
        this.tui.requestRender();
      });
      return;
    } else if (input === Action.Enter) {
      const selected = this.panel.getSelectedEntry();
      if (!selected) return;

      if (selected.isDirectory) {
        // Enter on directory: select for workspace switch
        const selectedPath = selected.path;

        // Switch to loading mode immediately
        this.mode = 'loading';
        this.version++;
        this.tui.requestRender();

        // Discover session options (no panel navigation)
        this.discoverOptions(selectedPath).then((data) => {
          this.selectionData = data;
          this.selectionIndex = 0;
          this.mode = 'selecting';
          this.version++;
          this.tui.requestRender();
        }).catch(() => {
          // Discovery failed, go back to browsing
          this.mode = 'browsing';
          this.version++;
          this.tui.requestRender();
        });
        return;
      } else {
        // Enter on file: open for viewing
        this.openFileForViewing(selected.path, selected.name);
        return;
      }
    } else if (input === Action.Edit) {
      // 'e' key on a file in browsing mode — open for editing (delegated to pi)
      const selected = this.panel.getSelectedEntry();
      if (selected && !selected.isDirectory) {
        this.done({ action: 'edit_file', filePath: selected.path });
        return;
      }
    } else if (input === Action.Escape) {
      this.done({ action: 'cancel' });
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

    const innerWidth = width - 2; // subtract left+right border
    if (innerWidth < 10) {
      const line = truncateToWidth('Browser too narrow', width);
      return [line];
    }

    let lines: string[];

    switch (this.mode) {
      case 'browsing':
        lines = this.renderBrowsing(innerWidth);
        break;
      case 'loading':
        lines = this.renderLoading(innerWidth);
        break;
      case 'selecting':
        lines = this.renderSelecting(innerWidth);
        break;
      case 'viewing':
        lines = this.renderViewing(innerWidth);
        break;
    }

    // Add border
    const bordered = this.addBorder(lines, innerWidth);
    this.cachedLines = bordered;
    this.cachedWidth = width;
    this.cachedVersion = this.version;
    return bordered;
  }

  // ---- Input handling for selecting mode ----

  // ---- Input handling for viewing mode ----

  private handleViewingInput(input: Direction | Action): void {
    const maxLineIdx = Math.max(0, this.viewingLines.length - 1);

    if (input === Direction.Up) {
      this.viewingScrollOffset = Math.max(0, this.viewingScrollOffset - 1);
    } else if (input === Direction.Down) {
      this.viewingScrollOffset = Math.min(maxLineIdx, this.viewingScrollOffset + 1);
    } else if (input === Action.PageUp) {
      this.viewingScrollOffset = Math.max(0, this.viewingScrollOffset - this.getViewingPageSize());
    } else if (input === Action.PageDown) {
      this.viewingScrollOffset = Math.min(maxLineIdx, this.viewingScrollOffset + this.getViewingPageSize());
    } else if (input === Action.Escape || input === Direction.Left) {
      // Exit viewing, return to browsing
      this.mode = 'browsing';
      this.viewingFilePath = '';
      this.viewingLines = [];
      this.viewingScrollOffset = 0;
    } else if (input === Action.Edit) {
      // Delegate editing to pi
      this.done({ action: 'edit_file', filePath: this.viewingFilePath });
    }
  }

  private getViewingPageSize(): number {
    // Max browsing entries minus header + status + hints + view meta
    return this.getMaxBrowsingEntries() - 3;
  }

  private openFileForViewing(filePath: string, fileName: string): void {
    this.mode = 'loading';
    this.version++;
    this.tui.requestRender();

    this.readFile(filePath).then((content) => {
      const byteSize = new TextEncoder().encode(content).length;
      if (byteSize > FileBrowserComponent.MAX_VIEW_SIZE) {
        this.viewingLines = ['\u26A0 File too large (' + formatSize(byteSize) + '). Press Esc to go back.'];
      } else {
        // Check for binary content
        if (this.isBinaryContent(content)) {
          this.viewingLines = ['\u26A0 Binary file, cannot display. Press Esc to go back.'];
        } else {
          this.viewingLines = content.split('\n');
        }
      }
      this.viewingFilePath = filePath;
      this.viewingFileName = fileName;
      this.viewingScrollOffset = 0;
      this.mode = 'viewing';
      this.version++;
      this.tui.requestRender();
    }).catch((err) => {
      this.viewingLines = ['\u26A0 Error: ' + String(err.message || err)];
      this.viewingFilePath = filePath;
      this.viewingFileName = fileName;
      this.viewingScrollOffset = 0;
      this.mode = 'viewing';
      this.version++;
      this.tui.requestRender();
    });
  }

  /** Heuristic: treat content as binary if it contains null bytes in first 8KB */
  private isBinaryContent(content: string): boolean {
    const sample = content.slice(0, 8192);
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code === 0) return true;
    }
    return false;
  }

  private handleSelectingInput(input: Direction | Action): void {
    const data = this.selectionData;
    if (!data || data.options.length === 0) return;

    if (input === Direction.Up) {
      this.selectionIndex = Math.max(0, this.selectionIndex - 1);
    } else if (input === Direction.Down) {
      this.selectionIndex = Math.min(data.options.length - 1, this.selectionIndex + 1);
    } else if (input === Action.Enter) {
      const option = data.options[this.selectionIndex];
      if (!option) return;

      if (option.isBack) {
        // Go back to browsing (already inside the directory)
        this.mode = 'browsing';
        this.selectionData = null;
        return;
      }

      if (option.isNewSession) {
        this.done({ action: 'new_session', directory: data.directory });
        return;
      }

      if (option.sessionPath) {
        this.done({ action: 'resume_session', directory: data.directory, sessionPath: option.sessionPath });
        return;
      }
    } else if (input === Action.Escape) {
      // ESC in selecting: go back to browsing (already inside the directory)
      this.mode = 'browsing';
      this.selectionData = null;
      return;
    } else if (input === Direction.Left) {
      this.mode = 'browsing';
      this.selectionData = null;
      return;
    }
  }

  // ---- Rendering modes ----

  private renderBrowsing(innerWidth: number): string[] {
    const lines: string[] = [];

    // Header separator (path is in the border)
    lines.push('\u2500'.repeat(innerWidth));

    // File entries
    const maxEntries = this.getMaxBrowsingEntries();
    const entries = this.renderPanelEntries(
      this.panel.entries,
      this.panel.selectedIndex,
      innerWidth,
      maxEntries,
    );

    for (let i = 0; i < maxEntries; i++) {
      lines.push(entries[i] ?? ' '.repeat(innerWidth));
    }

    // Status bar
    const status = truncateToWidth(this.renderStatusBar(), innerWidth);
    lines.push(status + ' '.repeat(Math.max(0, innerWidth - visibleWidth(status))));

    // Help hints
    const hints = truncateToWidth('\u21B5=open  \u2192=browse  e=edit  \u2191\u2193\u2190  Esc', innerWidth);
    lines.push('\x1b[2m' + hints + ' '.repeat(Math.max(0, innerWidth - visibleWidth(hints))) + '\x1b[22m');

    return lines;
  }

  private renderLoading(innerWidth: number): string[] {
    const lines: string[] = [];

    lines.push('\u2500'.repeat(innerWidth));

    // Center the loading message
    const loadingMsg = '\u23F3 Discovering sessions...';
    const padded = ' '.repeat(Math.max(0, Math.floor((innerWidth - visibleWidth(loadingMsg)) / 2)))
      + truncateToWidth(loadingMsg, innerWidth);
    lines.push(padded + ' '.repeat(Math.max(0, innerWidth - visibleWidth(padded))));

    // Fill remaining space
    const maxEntries = this.getMaxBrowsingEntries() + 2; // +2 for status + hints
    for (let i = 1; i < maxEntries; i++) {
      lines.push(' '.repeat(innerWidth));
    }

    return lines;
  }

  private renderSelecting(innerWidth: number): string[] {
    const data = this.selectionData;
    if (!data) return this.renderLoading(innerWidth);

    const lines: string[] = [];

    // Config info line
    const configLine = truncateToWidth(data.configDescription, innerWidth);
    lines.push('\x1b[2m' + configLine + ' '.repeat(Math.max(0, innerWidth - visibleWidth(configLine))) + '\x1b[22m');

    // Separator
    lines.push('\u2500'.repeat(innerWidth));

    // Options
    const maxOptionRows = this.getMaxBrowsingEntries() - 2; // -2 for config + separator

    for (let i = 0; i < maxOptionRows; i++) {
      if (i >= data.options.length) {
        lines.push(' '.repeat(innerWidth));
        continue;
      }

      const option = data.options[i];
      const isSelected = i === this.selectionIndex;

      let entryText = ' ' + option.label;

      entryText = truncateToWidth(entryText, innerWidth);
      const entryVisibleWidth = visibleWidth(entryText);
      const padding = Math.max(0, innerWidth - entryVisibleWidth);
      entryText += ' '.repeat(padding);

      if (isSelected) {
        entryText = '\x1b[7m' + entryText + '\x1b[27m';
      }
      lines.push(entryText);
    }

    // Status bar
    const status = truncateToWidth('\x1b[1mSelect action\x1b[22m', innerWidth);
    lines.push(status + ' '.repeat(Math.max(0, innerWidth - visibleWidth(status))));

    // Help hints
    const hints = truncateToWidth('\u21B5=confirm  \u2191\u2193=select  Esc/\u2190=back', innerWidth);
    lines.push('\x1b[2m' + hints + ' '.repeat(Math.max(0, innerWidth - visibleWidth(hints))) + '\x1b[22m');

    return lines;
  }

  private renderViewing(innerWidth: number): string[] {
    const lines: string[] = [];

    // File info line
    const infoLine = truncateToWidth(' \u{1F4C4} ' + this.viewingFileName + ' (' + this.viewingLines.length + ' lines)', innerWidth);
    lines.push('\x1b[1m' + infoLine + ' '.repeat(Math.max(0, innerWidth - visibleWidth(infoLine))) + '\x1b[22m');

    // Separator
    lines.push('\u2500'.repeat(innerWidth));

    // Content area lines
    const contentHeight = this.getViewingPageSize();
    const lineNumWidth = Math.max(3, String(this.viewingLines.length).length);

    for (let i = 0; i < contentHeight; i++) {
      const lineIdx = this.viewingScrollOffset + i;
      if (lineIdx < this.viewingLines.length) {
        const lineNum = String(lineIdx + 1).padStart(lineNumWidth);
        const prefix = '\x1b[2m' + lineNum + ' \x1b[22m';
        const prefixWidth = lineNumWidth + 1; // lineNum + space
        const contentWidth = innerWidth - prefixWidth;
        const rawLine = this.viewingLines[lineIdx];
        const truncated = truncateToWidth(rawLine, contentWidth);
        const padding = Math.max(0, contentWidth - visibleWidth(truncated));
        lines.push(prefix + truncated + ' '.repeat(padding));
      } else {
        lines.push(' '.repeat(innerWidth));
      }
    }

    // Status / scroll indicator
    const scrollPct = this.viewingLines.length > contentHeight
      ? ' (' + Math.round((this.viewingScrollOffset / Math.max(1, this.viewingLines.length - contentHeight)) * 100) + '%)'
      : '';
    const statusText = '\x1b[1mViewing\x1b[22m' + scrollPct;
    const status = truncateToWidth(statusText, innerWidth);
    lines.push(status + ' '.repeat(Math.max(0, innerWidth - visibleWidth(status))));

    // Help hints
    const hints = truncateToWidth('\u2191\u2193/PgUp/PgDn=scroll  e=edit  Esc/\u2190=back', innerWidth);
    lines.push('\x1b[2m' + hints + ' '.repeat(Math.max(0, innerWidth - visibleWidth(hints))) + '\x1b[22m');

    return lines;
  }

  // ---- Border rendering ----

  private addBorder(innerLines: string[], innerWidth: number): string[] {
    const result: string[] = [];

    // Top border with path header
    const pathLabel = this.mode === 'viewing'
      ? ' View: ' + this.viewingFileName + ' '
      : this.mode === 'selecting' && this.selectionData
        ? ' Open: ' + this.selectionData.directory + ' '
        : ' ' + this.panel.currentPath + ' ';
    const pathHeader = truncateToWidth(pathLabel, innerWidth);
    const pathPad = innerWidth - visibleWidth(pathHeader);
    result.push(TL + H + '\x1b[1m' + pathHeader + ' '.repeat(pathPad) + '\x1b[22m' + H + TR);

    for (const line of innerLines) {
      result.push(V + line + V);
    }

    // Bottom border
    result.push(BL + H.repeat(innerWidth) + BR);

    return result;
  }

  // ---- Shared rendering helpers ----

  private getMaxBrowsingEntries(): number {
    return 16;
  }

  private renderPanelEntries(
    entries: ReadonlyArray<FileEntry>,
    selectedIndex: number,
    innerWidth: number,
    maxVisible: number,
  ): string[] {
    const lines: string[] = [];
    const scrollOffset = this.calculateScrollOffset(entries.length, selectedIndex, maxVisible);

    for (let displayIdx = 0; displayIdx < maxVisible; displayIdx++) {
      const entryIdx = displayIdx + scrollOffset;
      if (entryIdx >= entries.length) {
        lines.push(' '.repeat(innerWidth));
        continue;
      }

      const entry = entries[entryIdx];
      const isSelected = entryIdx === selectedIndex;
      const icon = entry.isDirectory ? '\u{1F4C1}' : '\u{1F4C4}';
      const suffix = entry.isDirectory ? '/' : '';

      let entryText = ' ' + icon + ' ' + entry.name + suffix;
      entryText = truncateToWidth(entryText, innerWidth);
      const entryVisibleWidth = visibleWidth(entryText);
      const padding = Math.max(0, innerWidth - entryVisibleWidth);
      entryText += ' '.repeat(padding);

      if (isSelected) {
        entryText = '\x1b[7m' + entryText + '\x1b[27m';
      } else if (entry.isDirectory) {
        entryText = '\x1b[1m' + entryText + '\x1b[22m';
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
      const size = selected.isDirectory ? '' : ' ' + formatSize(selected.size);
      entryInfo = type + ' ' + selected.name + size;
    }

    return ' \x1b[1m' + entryInfo + '\x1b[22m';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
}