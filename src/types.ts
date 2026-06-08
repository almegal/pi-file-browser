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

/** Result of a navigation attempt */
export interface NavigationResult {
  readonly success: boolean;
  readonly newPath?: string;
  readonly error?: string;
}

/** Result returned when the file browser closes */
export type BrowserResult =
  | { action: 'cancel' }
  | { action: 'new_session'; directory: string }
  | { action: 'resume_session'; directory: string; sessionPath: string };

/** Information about local config files in a directory */
export interface DirectoryConfigInfo {
  readonly directory: string;
  readonly hasAgentsMd: boolean;
  readonly hasClaudeMd: boolean;
  readonly hasPiDir: boolean;
  readonly hasAgentsDir: boolean;
  readonly configItems: readonly string[];
  readonly description: string;
}

/** Information about sessions for a directory */
export interface DirectorySessionInfo {
  readonly directory: string;
  readonly sessions: readonly SessionSummary[];
  readonly hasExistingSession: boolean;
  readonly mostRecentSession?: SessionSummary;
}

/** Simplified session info for display */
export interface SessionSummary {
  readonly path: string;
  readonly name?: string;
  readonly modified: Date;
  readonly firstMessage: string;
  readonly messageCount: number;
}

/** Options shown in the selection menu */
export interface DirectoryOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly sessionPath?: string;
  readonly isNewSession?: boolean;
  readonly isBack?: boolean;
}

/** Data for the selection menu, discovered asynchronously */
export interface SelectionData {
  readonly directory: string;
  readonly configDescription: string;
  readonly options: readonly DirectoryOption[];
}

/** Async callback to discover options for a directory */
export type DiscoverOptionsFn = (directory: string) => Promise<SelectionData>;

/** Component mode */
export type BrowserMode = 'browsing' | 'loading' | 'selecting';