// ============================================================
// NavigationInputHandler — maps keys to directions/actions
// (Single Responsibility: input mapping only)
// (Open/Closed: new key bindings can be added without modifying consumers)
// Uses pi-tui's matchesKey() for robust key detection
// ============================================================

import { matchesKey, Key } from '@earendil-works/pi-tui';
import { IInputHandler } from '../interfaces/IInputHandler';
import { Direction, Action } from '../types';

/** Key binding configuration */
interface KeyBinding {
  readonly match: (data: string) => boolean;
  readonly result: Direction | Action;
}

export class NavigationInputHandler implements IInputHandler {
  private readonly bindings: ReadonlyArray<KeyBinding>;

  constructor() {
    this.bindings = [
      // Arrow keys
      { match: (d) => matchesKey(d, Key.up), result: Direction.Up },
      { match: (d) => matchesKey(d, Key.down), result: Direction.Down },
      { match: (d) => matchesKey(d, Key.left), result: Direction.Left },
      { match: (d) => matchesKey(d, Key.right), result: Direction.Right },
      // Vim-style
      { match: (d) => d === 'k', result: Direction.Up },
      { match: (d) => d === 'j', result: Direction.Down },
      { match: (d) => d === 'h', result: Direction.Left },
      { match: (d) => d === 'l', result: Direction.Right },
      // Actions
      { match: (d) => matchesKey(d, Key.enter), result: Action.Enter },
      { match: (d) => matchesKey(d, Key.escape), result: Action.Escape },
      { match: (d) => d === 'q', result: Action.Escape },
      { match: (d) => matchesKey(d, Key.tab), result: Action.Tab },
      { match: (d) => matchesKey(d, Key.pageUp), result: Action.PageUp },
      { match: (d) => matchesKey(d, Key.pageDown), result: Action.PageDown },
      // Shortcuts
      { match: (d) => d === 'e', result: Action.Edit },
    ];
  }

  handleKey(data: string): Direction | Action | null {
    for (const binding of this.bindings) {
      if (binding.match(data)) {
        return binding.result;
      }
    }
    return null;
  }
}