// ============================================================
// StatusBar — renders the bottom status bar
// (Single Responsibility: status bar rendering)
// ============================================================

import blessed from 'blessed';

export class StatusBar {
  private readonly box: blessed.Widgets.BoxElement;

  constructor(screen: blessed.Widgets.Screen) {
    this.box = blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        bg: 'cyan',
        fg: 'black',
      },
    });
  }

  render(text: string): void {
    this.box.setContent(text);
  }
}