#!/usr/bin/env node
// ============================================================
// Entry point — composes the application using dependency injection
// (Composition Root pattern: all wiring happens here)
// ============================================================

import { FileSystemProvider } from './providers/FileSystemProvider';
import { NavigationInputHandler } from './handlers/NavigationInputHandler';
import { FileBrowserApp } from './app/FileBrowserApp';
import { IFileSystemProvider } from './interfaces/IFileSystemProvider';
import { IInputHandler } from './interfaces/IInputHandler';
import { IFileBrowserApp } from './interfaces/IFileBrowserApp';

async function main(): Promise<void> {
  // Composition Root — inject dependencies
  const fsProvider: IFileSystemProvider = new FileSystemProvider();
  const inputHandler: IInputHandler = new NavigationInputHandler();
  const app: IFileBrowserApp = new FileBrowserApp(fsProvider, inputHandler);

  try {
    await app.start();
  } catch (error) {
    process.stderr.write(`Fatal error: ${error}\n`);
    process.exit(1);
  }
}

main();