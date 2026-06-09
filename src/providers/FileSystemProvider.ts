import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { FileEntry } from '../types';

export class FileSystemProvider implements IFileSystemProvider {
  async listDirectory(dirPath: string, options?: { showHidden?: boolean }): Promise<FileEntry[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const showHidden = options?.showHidden ?? false;

    const dirs: FileEntry[] = [];
    const files: FileEntry[] = [];

    for (const entry of entries) {
      if (!showHidden && entry.name.startsWith('.')) continue;

      const fullPath = path.join(dirPath, entry.name);
      try {
        const stat = await fs.stat(fullPath);
        const fileEntry: FileEntry = {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stat.size,
          modified: stat.mtime,
        };
        if (fileEntry.isDirectory) {
          dirs.push(fileEntry);
        } else {
          files.push(fileEntry);
        }
      } catch {
        // permission denied, broken symlinks, etc.
      }
    }

    const comparator = (a: FileEntry, b: FileEntry): number =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

    dirs.sort(comparator);
    files.sort(comparator);

    const parentPath = this.getParentPath(dirPath);
    const result: FileEntry[] = [];
    if (dirPath !== parentPath) {
      result.push({ name: '..', path: parentPath, isDirectory: true, size: 0, modified: new Date(0) });
    }
    result.push(...dirs, ...files);
    return result;
  }

  async isDirectory(pathStr: string): Promise<boolean> {
    try {
      const stat = await fs.stat(pathStr);
      return stat.isDirectory();
    } catch { return false; }
  }

  async exists(pathStr: string): Promise<boolean> {
    try { await fs.access(pathStr); return true; }
    catch { return false; }
  }

  getParentPath(dirPath: string): string {
    const parent = path.dirname(dirPath);
    return parent === dirPath ? dirPath : parent;
  }

  getBaseName(pathStr: string): string {
    return path.basename(pathStr);
  }

  joinPath(...segments: string[]): string { return path.join(...segments); }
  getHomeDirectory(): string { return os.homedir(); }

  async readFile(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }
}