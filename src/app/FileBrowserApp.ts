// ============================================================
// FileBrowserApp — orchestrator: composes the extension command
// Handles directory selection, session discovery, and session switching
// ============================================================

import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import type { SessionInfo } from '@earendil-works/pi-coding-agent';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { IInputHandler } from '../interfaces/IInputHandler';
import { PanelModel } from '../models/PanelModel';
import { FileBrowserComponent } from '../components/FileBrowserComponent';
import { ConfigDiscovery } from '../services/ConfigDiscovery';
import type { BrowserResult, DirectoryConfigInfo, DirectoryOption, SelectionData } from '../types';

export class FileBrowserApp {
  private readonly configDiscovery: ConfigDiscovery;

  constructor(
    private readonly fsProvider: IFileSystemProvider,
    private readonly inputHandler: IInputHandler,
  ) {
    this.configDiscovery = new ConfigDiscovery(fsProvider);
  }

  register(pi: ExtensionAPI): void {
    pi.registerCommand('files', {
      description: 'Open file browser \u2014 select a directory to switch workspace',

      handler: async (_args, ctx) => {
        if (ctx.mode !== 'tui') {
          ctx.ui.notify('File browser requires interactive (TUI) mode', 'error');
          return;
        }

        let currentPath = ctx.cwd;
        const isDir = await this.fsProvider.isDirectory(currentPath);
        if (!isDir) {
          currentPath = this.fsProvider.getHomeDirectory();
        }

        // Loop: browser → edit → browser → ... until cancel, new_session, or resume_session
        while (true) {
          const panel = new PanelModel(this.fsProvider, currentPath);
          await panel.refresh();

          const result = await ctx.ui.custom<BrowserResult>(
            (tui, _theme, _keybindings, done) => {
              const component = new FileBrowserComponent(
                panel,
                this.inputHandler,
                tui,
                done,
                (directory) => this.discoverOptions(directory),
                (filePath) => this.fsProvider.readFile(filePath),
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

          if (result.action === 'edit_file') {
            // Open pi's built-in editor, then reopen browser at same directory
            try {
              const content = await this.fsProvider.readFile(result.filePath);
              const edited = await ctx.ui.editor(
                'Edit: ' + this.shortenPath(result.filePath),
                content,
              );
              if (edited !== undefined) {
                await this.fsProvider.writeFile(result.filePath, edited);
                ctx.ui.notify('Saved: ' + this.shortenPath(result.filePath), 'info');
              }
            } catch (err) {
              ctx.ui.notify('Failed to edit file: ' + String(err), 'error');
            }
            // Reopen browser at the same directory
            continue;
          } else if (result.action === 'new_session') {
            await this.createNewSession(result.directory, ctx);
            return; // ctx is stale after switchSession
          } else if (result.action === 'resume_session') {
            await this.resumeSession(result.sessionPath, result.directory, ctx);
            return; // ctx is stale after switchSession
          } else {
            // 'cancel' — exit loop
            return;
          }
        }
      },
    });
  }

  // ---- Async discovery for selection menu ----

  private async discoverOptions(directory: string): Promise<SelectionData> {
    const [sessionInfo, configInfo] = await Promise.all([
      this.discoverSessions(directory),
      this.configDiscovery.discover(directory),
    ]);

    const options = this.buildOptions(sessionInfo, configInfo);

    return {
      directory,
      configDescription: configInfo.description,
      options,
    };
  }

  private async discoverSessions(directory: string) {
    try {
      const sessions = await SessionManager.list(directory);
      return sessions
        .sort((a: SessionInfo, b: SessionInfo) => b.modified.getTime() - a.modified.getTime())
        .map((s: SessionInfo) => ({
          path: s.path,
          name: s.name,
          modified: s.modified,
          firstMessage: s.firstMessage,
          messageCount: s.messageCount,
        }));
    } catch {
      return [];
    }
  }

  private buildOptions(
    sessions: Array<{ path: string; name?: string; modified: Date; firstMessage: string; messageCount: number }>,
    configInfo: DirectoryConfigInfo,
  ): DirectoryOption[] {
    const options: DirectoryOption[] = [];

    options.push({
      id: 'new_session',
      label: '\u{1F195} New session',
      description: 'Start a fresh session in ' + configInfo.directory,
      isNewSession: true,
    });

    for (const session of sessions.slice(0, 5)) {
      const dateStr = this.formatDate(session.modified);
      const nameStr = session.name ? ' \u2014 ' + session.name : '';
      const msgStr = session.firstMessage
        ? ' "' + this.truncate(session.firstMessage, 30) + '"'
        : '';
      const countStr = session.messageCount + ' msgs';

      options.push({
        id: 'resume_' + session.path,
        label: '\u{1F504} ' + dateStr + nameStr + ' (' + countStr + ')' + msgStr,
        description: 'Resume session from ' + dateStr,
        sessionPath: session.path,
      });
    }

    options.push({
      id: 'back',
      label: '\u21A9 Back to browser',
      description: 'Return to the file browser',
      isBack: true,
    });

    return options;
  }

  // ---- Session management ----

  private async createNewSession(
    directory: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    ctx.ui.setStatus('file-browser', 'Creating new session...');

    const sm = SessionManager.create(directory);
    sm.appendCustomEntry('file-browser-workspace', { directory });

    // Force-write session file to disk before switchSession.
    // Without this, SessionManager keeps entries in memory (flushed=false) until an
    // assistant message arrives, so switchSession -> SessionManager.open() would
    // find an empty/missing file and fall back to process.cwd() instead of the
    // intended directory.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sm as any)._rewriteFile();

    const sessionFile = sm.getSessionFile();
    if (!sessionFile) {
      ctx.ui.notify('Failed to create session file', 'error');
      ctx.ui.setStatus('file-browser', undefined);
      return;
    }

    try {
      await ctx.switchSession(sessionFile, {
        withSession: async (newCtx) => {
          newCtx.ui.setStatus('file-browser', undefined);
          newCtx.ui.notify('Switched to new session in ' + this.shortenPath(directory), 'info');
        },
      });
      // ctx is stale after switchSession — return immediately
    } catch {
      ctx.ui.notify('Failed to create session', 'error');
      ctx.ui.setStatus('file-browser', undefined);
    }
  }

  private async resumeSession(
    sessionPath: string,
    directory: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    ctx.ui.setStatus('file-browser', 'Switching session...');

    try {
      await ctx.switchSession(sessionPath, {
        withSession: async (newCtx) => {
          newCtx.ui.setStatus('file-browser', undefined);
          newCtx.ui.notify('Resumed session in ' + this.shortenPath(directory), 'info');
        },
      });
      // ctx is stale after switchSession — return immediately
    } catch {
      ctx.ui.notify('Failed to switch session', 'error');
      ctx.ui.setStatus('file-browser', undefined);
    }
  }

  // ---- Utility helpers ----

  private shortenPath(filePath: string): string {
    const home = this.fsProvider.getHomeDirectory();
    if (filePath.startsWith(home)) {
      return '~' + filePath.slice(home.length);
    }
    return filePath;
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    if (diffHrs < 24) return diffHrs + 'h ago';
    if (diffDays < 7) return diffDays + 'd ago';
    return date.toLocaleDateString();
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '\u2026';
  }
}