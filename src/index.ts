#!/usr/bin/env node
import { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { FileSystemProvider } from './providers/FileSystemProvider';
import { NavigationInputHandler } from './handlers/NavigationInputHandler';
import { FileBrowserApp } from './app/FileBrowserApp';
import { IFileSystemProvider } from './interfaces/IFileSystemProvider';
import { IInputHandler } from './interfaces/IInputHandler';

export default function (pi: ExtensionAPI): void {
  const fsProvider: IFileSystemProvider = new FileSystemProvider();
  const inputHandler: IInputHandler = new NavigationInputHandler();
  const app = new FileBrowserApp(fsProvider, inputHandler);
  app.register(pi);
}