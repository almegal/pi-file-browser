// ============================================================
// NavigationInputHandler — maps keys to directions/actions
// (Single Responsibility: input mapping only)
// (Open/Closed: new key bindings can be added without modifying consumers)
// ============================================================

import { IInputHandler } from '../interfaces/IInputHandler';
import { Direction, Action } from '../types';

/** Key mapping type */
type DirectionOrAction = Direction | Action;

/** Key mapping configuration — easily extensible */
const KEY_MAP = new Map<string, DirectionOrAction>([
  // Arrow keys and movement
  ['up', Direction.Up],
  ['down', Direction.Down],
  ['left', Direction.Left],
  ['right', Direction.Right],
  ['k', Direction.Up],
  ['j', Direction.Down],
  ['h', Direction.Left],
  ['l', Direction.Right],

  // Actions
  ['enter', Action.Enter],
  ['escape', Action.Escape],
  ['q', Action.Escape],
  ['tab', Action.Tab],
]);

export class NavigationInputHandler implements IInputHandler {
  handleKey(key: string, _ch?: string): Direction | Action | null {
    return KEY_MAP.get(key) ?? null;
  }
}