// ============================================================
// IInputHandler — processes keyboard events into actions
// (Single Responsibility: input interpretation only)
// ============================================================

import { Direction, Action } from '../types';

export interface IInputHandler {
  /** Interpret a key press, returning direction or action */
  handleKey(data: string): Direction | Action | null;
}