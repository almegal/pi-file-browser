// ============================================================
// FileBrowserApp — orchestrator: composes the extension command
// (Composition Root: all dependency wiring happens here)
// Uses pi's ctx.ui.custom() to host the TUI component
// ============================================================

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { IInputHandler } from '../interfaces/IInputHandler';
import { PanelModel } from '../models/PanelModel';
import { FileBrowserComponent } from '../components/FileBrowserComponent';
import { ActivePanel } from '../types';

export class FileBrowserApp {
  constructor(
    private readonly fsProvider: IFileSystemProvider,
    private readonly inputHandler: IInputHandler,
  ) {}

  /** Register the /files command with pi */
  register(pi: ExtensionAPI): void {
    pi.registerCommand('files', {
      description: 'Open dual-pane file browser (Total Commander style)',

      handler: async (_args, ctx) => {
        if (ctx.mode !== 'tui') {
          ctx.ui.notify('File browser requires interactive (TUI) mode', 'error');
          return;
        }

        const homeDir = this.fsProvider.getHomeDirectory();

        // Create panel models
        const leftPanel = new PanelModel(this.fsProvider, homeDir, ActivePanel.Left);
        const rightPanel = new PanelModel(this.fsProvider, homeDir, ActivePanel.Right);

        // Initial load
        await leftPanel.refresh();
        await rightPanel.refresh();

        // Host the component via pi's custom UI
        await ctx.ui.custom<void>((tui, _theme, _keybindings, done) => {
          const component = new FileBrowserComponent(
            leftPanel,
            rightPanel,
            this.inputHandler,
            tui,
            () => done(undefined),
            ActivePanel.Left,
          );
          return component;
        });
      },
    });
  }
}