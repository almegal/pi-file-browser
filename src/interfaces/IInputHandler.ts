// ============================================================
// IInputHandler — processes keyboard events into actions
// (Single Responsibility: input interpretation only)
// ============================================================

import { Direction, Action } from '../types';

export interface IInputHandler {
  /** Interpret a key press, returning direction or action */
  handleKey(key: string, ch?: string): Direction | Action | null;
}