// ============================================================
// PanelView — renders a single panel using blessed
// (Single Responsibility: rendering only, no business logic)
// ============================================================

import blessed from 'blessed';
import { IPanelView } from '../interfaces/IPanelView';
import { FileEntry, ActivePanel } from '../types';

export class PanelView implements IPanelView {
  private readonly box: blessed.Widgets.BoxElement;

  constructor(
    private readonly screen: blessed.Widgets.Screen,
    public readonly panelId: ActivePanel,
    left: string | number,
    width: string | number,
  ) {
    this.box = blessed.box({
      parent: screen,
      left,
      top: 0,
      width,
      height: '100%-1',
      border: 'line',
      label: '',
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      mouse: true,
      tags: true,
      style: {
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'white' },
      },
    });
  }

  render(
    entries: ReadonlyArray<FileEntry>,
    selectedIndex: number,
    currentPath: string,
    isActive: boolean,
  ): void {
    // Update border color based on active state
    this.box.style.border!.fg = isActive ? 'cyan' : 'blue';

    // Update title
    this.box.setLabel(` ${currentPath} `);

    // Build content lines
    const lines: string[] = entries.map((entry, index) => {
      const isSelected = index === selectedIndex;
      const name = entry.isDirectory ? `{bold}${entry.name}/{/bold}` : entry.name;
      const prefix = entry.isDirectory ? '📁 ' : '📄 ';

      if (isSelected && isActive) {
        return `{black-bg}{cyan-fg}${prefix}${name}{/cyan-fg}{/black-bg}`;
      }
      if (isSelected) {
        return `{blue-bg}{white-fg}${prefix}${name}{/white-fg}{/blue-bg}`;
      }
      return `${prefix}${name}`;
    });

    this.box.setContent(lines.join('\n'));
    this.box.scrollTo(Math.max(0, selectedIndex));

    this.screen.render();
  }

  getElement(): unknown {
    return this.box;
  }
}