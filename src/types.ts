// ============================================================
// Domain types for the file browser
// ============================================================

/** Represents a single file system entry */
export interface FileEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly size: number;
  readonly modified: Date;
}

/** Navigation direction from keyboard input */
export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

/** Action triggered by keyboard */
export enum Action {
  Enter = 'ENTER',
  Escape = 'ESCAPE',
  Tab = 'TAB',
}

/** Which panel is currently active */
export enum ActivePanel {
  Left = 'LEFT',
  Right = 'RIGHT',
}

/** Result of a navigation attempt */
export interface NavigationResult {
  readonly success: boolean;
  readonly newPath?: string;
  readonly error?: string;
}