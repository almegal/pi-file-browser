// === FileBrowserComponent: TUI rendering + input handling for file browser ===

import type { Component } from '@earendil-works/pi-tui';
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui';
import { IPanelModel } from '../interfaces/IPanelModel';
import { IInputHandler } from '../interfaces/IInputHandler';
import { Direction, Action, BrowserResult, BrowserMode, SelectionData, DiscoverOptionsFn, FileEntry } from '../types';

const TL = '\u256D', TR = '\u256E', BL = '\u2570', BR = '\u256F', H = '\u2500', V = '\u2502';

export class FileBrowserComponent implements Component {
  private cachedLines: string[] = [];
  private cachedWidth = 0;
  private version = 0;
  private cachedVersion = -1;

  private mode: BrowserMode = 'browsing';
  private selectionData: SelectionData | null = null;
  private selectionIndex: number = 0;

  private searchActive: boolean = false;
  private searchQuery: string = '';
  private preSearchIndex: number = 0;

  private readonly done: (result: BrowserResult) => void;
  private readonly discoverOptions: DiscoverOptionsFn;

  constructor(
    private readonly panel: IPanelModel,
    private readonly inputHandler: IInputHandler,
    private readonly tui: { requestRender: () => void },
    done: (result: BrowserResult) => void,
    discoverOptions: DiscoverOptionsFn,
  ) {
    this.done = done;
    this.discoverOptions = discoverOptions;
  }

  handleInput(data: string): void {
    if (this.mode === 'loading') return;

    if (this.mode === 'selecting') {
      const input = this.inputHandler.handleKey(data);
      if (input === null) return;
      this.handleSelectingInput(input);
      this.version++;
      this.tui.requestRender();
      return;
    }

    if (this.searchActive) {
      this.handleSearchInput(data);
      this.version++;
      this.tui.requestRender();
      return;
    }

    // Browsing mode
    const input = this.inputHandler.handleKey(data);
    if (input === null) return;

    if (input === Direction.Up) {
      this.panel.moveUp();
    } else if (input === Direction.Down) {
      this.panel.moveDown();
    } else if (input === Direction.Left) {
      this.panel.goUp().then(() => { this.version++; this.tui.requestRender(); });
      return;
    } else if (input === Direction.Right) {
      this.panel.goInto().then(() => { this.version++; this.tui.requestRender(); });
      return;
    } else if (input === Action.Enter) {
      const selected = this.panel.getSelectedEntry();
      if (!selected) return;

      if (selected.isDirectory) {
        const selectedPath = selected.path;
        this.mode = 'loading';
        this.version++;
        this.tui.requestRender();

        this.discoverOptions(selectedPath).then((data) => {
          this.selectionData = data;
          this.selectionIndex = 0;
          this.mode = 'selecting';
          this.version++;
          this.tui.requestRender();
        }).catch(() => {
          this.mode = 'browsing';
          this.version++;
          this.tui.requestRender();
        });
        return;
      } else {
        this.done({ action: 'edit_file', filePath: selected.path });
        return;
      }
    } else if (input === Action.Escape) {
      this.done({ action: 'cancel' });
      return;
    } else if (input === Action.Search) {
      this.enterSearch();
    } else if (input === Action.Backspace) {
      // In browsing mode, backspace navigates up (same as left/h)
      this.panel.goUp().then(() => { this.version++; this.tui.requestRender(); });
      return;
    }

    this.version++;
    this.tui.requestRender();
  }

  private enterSearch(): void {
    this.searchActive = true;
    this.searchQuery = '';
    this.preSearchIndex = this.panel.selectedIndex;
    this.panel.setSearchQuery('');
  }

  private exitSearch(restorePosition: boolean): void {
    this.searchActive = false;
    this.searchQuery = '';
    if (restorePosition && this.panel.entries.length > 0) {
      this.panel.clearSearch();
      // Try to restore pre-search position by finding the same entry
      // Since clearSearch resets to full list, find the entry we had before
      // preSearchIndex was in the full list, so it should be valid
      if (this.preSearchIndex < this.panel.entries.length) {
        this.panel.selectIndex(this.preSearchIndex);
      }
    } else {
      this.panel.clearSearch();
    }
  }

  private handleSearchInput(data: string): void {
    // Single-char: control keys or search input
    if (data.length === 1) {
      const code = data.charCodeAt(0);
      // Escape
      if (code === 0x1b) {
        this.exitSearch(true);
        return;
      }
      // Backspace
      if (code === 0x7f || code === 0x08) {
        if (this.searchQuery.length > 0) {
          this.searchQuery = this.searchQuery.slice(0, -1);
          this.panel.setSearchQuery(this.searchQuery);
        } else {
          this.exitSearch(true);
        }
        return;
      }
      // Enter — confirm selection, exit search
      if (code === 0x0d) {
        this.exitSearch(false);
        return;
      }
      // Printable char (including j, k, h, l)
      if (code >= 0x20 && code < 0x7f) {
        this.searchQuery += data;
        this.panel.setSearchQuery(this.searchQuery);
        return;
      }
      return;
    }

    // Multi-char: escape sequences (arrows etc.)
    const input = this.inputHandler.handleKey(data);
    if (input === null) return;

    if (input === Direction.Up) {
      this.panel.moveUp();
    } else if (input === Direction.Down) {
      this.panel.moveDown();
    } else if (input === Direction.Left || input === Action.Escape) {
      this.exitSearch(true);
    } else if (input === Action.Enter) {
      this.exitSearch(false);
    }
  }

  invalidate(): void {
    this.cachedWidth = 0;
    this.cachedVersion = -1;
  }

  render(width: number): string[] {
    if (width === this.cachedWidth && this.cachedVersion === this.version) {
      return this.cachedLines;
    }

    const innerWidth = width - 2;
    if (innerWidth < 10) return [truncateToWidth('Browser too narrow', width)];

    let lines: string[];
    switch (this.mode) {
      case 'browsing': lines = this.renderBrowsing(innerWidth); break;
      case 'loading': lines = this.renderLoading(innerWidth); break;
      case 'selecting': lines = this.renderSelecting(innerWidth); break;
      default: lines = this.renderBrowsing(innerWidth); break;
    }

    const bordered = this.addBorder(lines, innerWidth);
    this.cachedLines = bordered;
    this.cachedWidth = width;
    this.cachedVersion = this.version;
    return bordered;
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
      if (option.isBack) { this.mode = 'browsing'; this.selectionData = null; return; }
      if (option.isNewSession) { this.done({ action: 'new_session', directory: data.directory }); return; }
      if (option.sessionPath) { this.done({ action: 'resume_session', directory: data.directory, sessionPath: option.sessionPath }); return; }
    } else if (input === Action.Escape || input === Direction.Left) {
      this.mode = 'browsing';
      this.selectionData = null;
    }
  }

  private renderBrowsing(w: number): string[] {
    const lines: string[] = [];
    lines.push('\u2500'.repeat(w));

    const max = 16;
    const entries = this.renderPanelEntries(this.panel.entries, this.panel.selectedIndex, w, max);
    for (let i = 0; i < max; i++) lines.push(entries[i] ?? ' '.repeat(w));

    if (this.searchActive) {
      const matchCount = this.panel.entries.length;
      const totalCount = this.panel.totalEntries;
      const searchLabel = '\u{1F50D} /' + this.searchQuery;
      const countLabel = matchCount === totalCount
        ? ''
        : ' (' + matchCount + '/' + totalCount + ')';
      const status = truncateToWidth(searchLabel + countLabel, w);
      lines.push('\x1b[1m' + status + '\x1b[22m' + ' '.repeat(Math.max(0, w - visibleWidth(status))));

      const hints = truncateToWidth('Enter=confirm  Esc/\u2190=cancel  \u232B=delete', w);
      lines.push('\x1b[2m' + hints + ' '.repeat(Math.max(0, w - visibleWidth(hints))) + '\x1b[22m');
    } else {
      const status = truncateToWidth(this.renderStatusBar(), w);
      lines.push('\x1b[1m' + status + '\x1b[22m' + ' '.repeat(Math.max(0, w - visibleWidth(status))));

      const hints = truncateToWidth('\u21B5=open  \u2192=browse  \u2191\u2193\u2190  /=search  Esc', w);
      lines.push('\x1b[2m' + hints + ' '.repeat(Math.max(0, w - visibleWidth(hints))) + '\x1b[22m');
    }
    return lines;
  }

  private renderLoading(w: number): string[] {
    const lines: string[] = [];
    lines.push('\u2500'.repeat(w));
    const msg = '\u23F3 Discovering sessions...';
    const padded = ' '.repeat(Math.max(0, Math.floor((w - visibleWidth(msg)) / 2))) + truncateToWidth(msg, w);
    lines.push(padded + ' '.repeat(Math.max(0, w - visibleWidth(padded))));
    for (let i = 1; i < 18; i++) lines.push(' '.repeat(w));
    return lines;
  }

  private renderSelecting(w: number): string[] {
    const data = this.selectionData;
    if (!data) return this.renderLoading(w);

    const lines: string[] = [];
    const configLine = truncateToWidth(data.configDescription, w);
    lines.push('\x1b[2m' + configLine + ' '.repeat(Math.max(0, w - visibleWidth(configLine))) + '\x1b[22m');
    lines.push('\u2500'.repeat(w));

    const maxRows = 14;
    for (let i = 0; i < maxRows; i++) {
      if (i >= data.options.length) { lines.push(' '.repeat(w)); continue; }
      const option = data.options[i];
      const isSelected = i === this.selectionIndex;
      let text = truncateToWidth(' ' + option.label, w);
      text += ' '.repeat(Math.max(0, w - visibleWidth(text)));
      if (isSelected) text = '\x1b[7m' + text + '\x1b[27m';
      lines.push(text);
    }

    const status = truncateToWidth('\x1b[1mSelect action\x1b[22m', w);
    lines.push(status + ' '.repeat(Math.max(0, w - visibleWidth(status))));

    const hints = truncateToWidth('\u21B5=confirm  \u2191\u2193=select  Esc/\u2190=back', w);
    lines.push('\x1b[2m' + hints + ' '.repeat(Math.max(0, w - visibleWidth(hints))) + '\x1b[22m');
    return lines;
  }

  private addBorder(innerLines: string[], innerWidth: number): string[] {
    const result: string[] = [];
    const pathLabel = this.mode === 'selecting' && this.selectionData
      ? ' Open: ' + this.selectionData.directory + ' '
      : ' ' + this.panel.currentPath + ' ';
    const header = truncateToWidth(pathLabel, innerWidth);
    const pad = innerWidth - visibleWidth(header);
    result.push(TL + H + '\x1b[1m' + header + ' '.repeat(pad) + '\x1b[22m' + H + TR);
    for (const line of innerLines) result.push(V + line + V);
    result.push(BL + H.repeat(innerWidth) + BR);
    return result;
  }

  private renderPanelEntries(
    entries: ReadonlyArray<FileEntry>, selectedIndex: number, w: number, maxVisible: number,
  ): string[] {
    const lines: string[] = [];
    const offset = this.calculateScrollOffset(entries.length, selectedIndex, maxVisible);
    for (let i = 0; i < maxVisible; i++) {
      const idx = i + offset;
      if (idx >= entries.length) { lines.push(' '.repeat(w)); continue; }
      const entry = entries[idx];
      const icon = entry.isDirectory ? '\u{1F4C1}' : '\u{1F4C4}';
      const suffix = entry.isDirectory ? '/' : '';
      let text = truncateToWidth(' ' + icon + ' ' + entry.name + suffix, w);
      text += ' '.repeat(Math.max(0, w - visibleWidth(text)));
      if (idx === selectedIndex) text = '\x1b[7m' + text + '\x1b[27m';
      else if (entry.isDirectory) text = '\x1b[1m' + text + '\x1b[22m';
      lines.push(text);
    }
    return lines;
  }

  private calculateScrollOffset(total: number, selected: number, maxVisible: number): number {
    if (total <= maxVisible) return 0;
    const half = Math.floor(maxVisible / 2);
    return Math.min(Math.max(0, selected - half), Math.max(0, total - maxVisible));
  }

  private renderStatusBar(): string {
    const s = this.panel.entries[this.panel.selectedIndex];
    let info = '(empty)';
    if (s) {
      const type = s.isDirectory ? 'DIR' : 'FILE';
      const size = s.isDirectory ? '' : ' ' + formatSize(s.size);
      info = type + ' ' + s.name + size;
    }
    return ' \x1b[1m' + info + '\x1b[22m';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB';
}