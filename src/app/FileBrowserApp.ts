// ============================================================
// FileBrowserApp — orchestrator: composes the extension command
// (Composition Root: all dependency wiring happens here)
// Uses pi's ctx.ui.custom() with overlay mode for centered widget
// ============================================================

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { IInputHandler } from '../interfaces/IInputHandler';
import { PanelModel } from '../models/PanelModel';
import { FileBrowserComponent } from '../components/FileBrowserComponent';

export class FileBrowserApp {
  constructor(
    private readonly fsProvider: IFileSystemProvider,
    private readonly inputHandler: IInputHandler,
  ) {}

  /** Register the /files command with pi */
  register(pi: ExtensionAPI): void {
    pi.registerCommand('files', {
      description: 'Open single-pane file browser',

      handler: async (_args, ctx) => {
        if (ctx.mode !== 'tui') {
          ctx.ui.notify('File browser requires interactive (TUI) mode', 'error');
          return;
        }

        const homeDir = this.fsProvider.getHomeDirectory();

        const panel = new PanelModel(this.fsProvider, homeDir);
        await panel.refresh();

        await ctx.ui.custom<void>(
          (tui, _theme, _keybindings, done) => {
            const component = new FileBrowserComponent(
              panel,
              this.inputHandler,
              tui,
              () => done(undefined),
            );
            return component;
          },
          {
            overlay: true,
            overlayOptions: {
              width: '60%',
              anchor: 'center',
              margin: { top: 2, bottom: 2 },
            },
          },
        );
      },
    });
  }
}