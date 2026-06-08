import { FileEntry } from '../types';

export interface IFileSystemProvider {
  listDirectory(dirPath: string): Promise<FileEntry[]>;
  isDirectory(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  getParentPath(path: string): string;
  joinPath(...segments: string[]): string;
  getHomeDirectory(): string;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
}