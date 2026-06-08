#!/usr/bin/env node
// ============================================================
// Entry point — composes the application using dependency injection
// (Composition Root pattern: all wiring happens here)
// ============================================================

import { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { FileSystemProvider } from './providers/FileSystemProvider';
import { NavigationInputHandler } from './handlers/NavigationInputHandler';
import { FileBrowserApp } from './app/FileBrowserApp';
import { IFileSystemProvider } from './interfaces/IFileSystemProvider';
import { IInputHandler } from './interfaces/IInputHandler';

export default function (pi: ExtensionAPI): void {
  // Composition Root — inject dependencies
  const fsProvider: IFileSystemProvider = new FileSystemProvider();
  const inputHandler: IInputHandler = new NavigationInputHandler();
  const app = new FileBrowserApp(fsProvider, inputHandler);
  app.register(pi);
}