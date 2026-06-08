export interface FileEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
  readonly size: number;
  readonly modified: Date;
}

export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

export enum Action {
  Enter = 'ENTER',
  Escape = 'ESCAPE',
  Tab = 'TAB',
  Search = 'SEARCH',
  Backspace = 'BACKSPACE',
}

export interface NavigationResult {
  readonly success: boolean;
  readonly newPath?: string;
  readonly error?: string;
}

export type BrowserResult =
  | { action: 'cancel' }
  | { action: 'new_session'; directory: string }
  | { action: 'resume_session'; directory: string; sessionPath: string }
  | { action: 'edit_file'; filePath: string };

export interface DirectoryConfigInfo {
  readonly directory: string;
  readonly hasAgentsMd: boolean;
  readonly hasClaudeMd: boolean;
  readonly hasPiDir: boolean;
  readonly hasAgentsDir: boolean;
  readonly configItems: readonly string[];
  readonly description: string;
}

export interface DirectorySessionInfo {
  readonly directory: string;
  readonly sessions: readonly SessionSummary[];
  readonly hasExistingSession: boolean;
  readonly mostRecentSession?: SessionSummary;
}

export interface SessionSummary {
  readonly path: string;
  readonly name?: string;
  readonly modified: Date;
  readonly firstMessage: string;
  readonly messageCount: number;
}

export interface DirectoryOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly sessionPath?: string;
  readonly isNewSession?: boolean;
  readonly isBack?: boolean;
}

export interface SelectionData {
  readonly directory: string;
  readonly configDescription: string;
  readonly options: readonly DirectoryOption[];
}

export type DiscoverOptionsFn = (directory: string) => Promise<SelectionData>;

export type BrowserMode = 'browsing' | 'loading' | 'selecting';