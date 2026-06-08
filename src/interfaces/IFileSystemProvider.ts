// ============================================================
// IFileSystemProvider — abstraction over file system operations
// (Dependency Inversion: high-level modules depend on this,
//  not on concrete fs calls)
// ============================================================

import { FileEntry } from '../types';

export interface IFileSystemProvider {
  /** List entries in a directory */
  listDirectory(dirPath: string): Promise<FileEntry[]>;

  /** Check if a path exists and is a directory */
  isDirectory(path: string): Promise<boolean>;

  /** Check if a path exists (file or directory) */
  exists(path: string): Promise<boolean>;

  /** Get the parent directory of a path */
  getParentPath(path: string): string;

  /** Join path segments */
  joinPath(...segments: string[]): string;

  /** Get the home directory */
  getHomeDirectory(): string;
}