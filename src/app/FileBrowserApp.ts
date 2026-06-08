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
import type { BrowserResult, DirectoryConfigInfo, DirectorySessionInfo, DirectoryOption } from '../types';

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

        // Main loop: browse → select directory → choose action → act or re-browse
        // On cancel/ESC from selection dialog, return to browser at same directory.
        // On session switch, return immediately (old ctx is stale after switchSession).
        while (true) {
          const result = await this.openBrowser(currentPath, ctx);
          if (result.action === 'cancel') {
            return;
          }

          if (result.action === 'select_directory') {
            const action = await this.handleDirectorySelection(result.path, ctx);
            if (action === 'session_switched') {
              // ctx is stale after switchSession — must not use it further
              return;
            }
            // 'cancel' (ESC or Cancel) — reopen browser at same directory
            // 'browse' removed: arrow keys handle navigation inside the browser
            currentPath = result.path;
            continue;
          }
        }
      },
    });
  }

  private async openBrowser(
    initialPath: string,
    ctx: ExtensionCommandContext,
  ): Promise<BrowserResult> {
    const panel = new PanelModel(this.fsProvider, initialPath);
    await panel.refresh();

    const result = await ctx.ui.custom<BrowserResult>(
      (tui, _theme, _keybindings, done) => {
        const component = new FileBrowserComponent(
          panel,
          this.inputHandler,
          tui,
          () => done({ action: 'cancel' }),
          (path: string) => done({ action: 'select_directory', path }),
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

    return result;
  }

  private async handleDirectorySelection(
    directory: string,
    ctx: ExtensionCommandContext,
  ): Promise<'session_switched' | 'cancel'> {
    const sessionInfo = await this.discoverSessions(directory);
    const configInfo = await this.configDiscovery.discover(directory);

    const options = this.buildOptions(sessionInfo, configInfo);

    const shortDir = this.shortenPath(directory);
    const title = 'Open: ' + shortDir + '\n' + configInfo.description;

    const choice = await ctx.ui.select(title, options.map((o) => o.label));

    if (!choice) {
      // ESC pressed — return to browser
      return 'cancel';
    }

    const selected = options.find((o) => o.label === choice);
    if (!selected || selected.isCancel) {
      // Cancel selected — return to browser
      return 'cancel';
    }

    if (selected.isNewSession) {
      return await this.createNewSession(directory, ctx);
    } else if (selected.sessionPath) {
      return await this.resumeSession(selected.sessionPath, directory, ctx);
    }

    return 'cancel';
  }

  private async discoverSessions(directory: string): Promise<DirectorySessionInfo> {
    try {
      const sessions = await SessionManager.list(directory);

      const sorted = sessions.sort(
        (a: SessionInfo, b: SessionInfo) => b.modified.getTime() - a.modified.getTime(),
      );

      return {
        directory,
        sessions: sorted.map((s: SessionInfo) => ({
          path: s.path,
          name: s.name,
          modified: s.modified,
          firstMessage: s.firstMessage,
          messageCount: s.messageCount,
        })),
        hasExistingSession: sorted.length > 0,
        mostRecentSession: sorted.length > 0
          ? {
              path: sorted[0].path,
              name: sorted[0].name,
              modified: sorted[0].modified,
              firstMessage: sorted[0].firstMessage,
              messageCount: sorted[0].messageCount,
            }
          : undefined,
      };
    } catch {
      return {
        directory,
        sessions: [],
        hasExistingSession: false,
        mostRecentSession: undefined,
      };
    }
  }

  private buildOptions(
    sessionInfo: DirectorySessionInfo,
    _configInfo: DirectoryConfigInfo,
  ): DirectoryOption[] {
    const options: DirectoryOption[] = [];

    options.push({
      id: 'new_session',
      label: '\u{1F195} New session',
      description: 'Start a fresh session in ' + sessionInfo.directory,
      isNewSession: true,
    });

    if (sessionInfo.hasExistingSession) {
      for (const session of sessionInfo.sessions.slice(0, 5)) {
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
    }

    options.push({
      id: 'cancel',
      label: '\u21A9 Back to browser',
      description: 'Return to the file browser',
      isCancel: true,
    });

    return options;
  }

  private async createNewSession(
    directory: string,
    ctx: ExtensionCommandContext,
  ): Promise<'session_switched' | 'cancel'> {
    ctx.ui.setStatus('file-browser', 'Creating new session...');

    const sm = SessionManager.create(directory);
    sm.appendCustomEntry('file-browser-workspace', { directory });

    const sessionFile = sm.getSessionFile();
    if (!sessionFile) {
      ctx.ui.notify('Failed to create session file', 'error');
      ctx.ui.setStatus('file-browser', undefined);
      return 'cancel';
    }

    // After switchSession resolves, ctx is stale. All post-switch work
    // must go into withSession using the new context. Status bar is
    // cleared in withSession because the old ctx becomes invalid.
    try {
      await ctx.switchSession(sessionFile, {
        withSession: async (newCtx) => {
          newCtx.ui.setStatus('file-browser', undefined);
          newCtx.ui.notify('Switched to new session in ' + this.shortenPath(directory), 'info');
        },
      });
      // ctx is stale — return immediately, do not touch ctx
      return 'session_switched';
    } catch {
      // switchSession threw before replacement — ctx is still valid
      ctx.ui.notify('Failed to create session', 'error');
      ctx.ui.setStatus('file-browser', undefined);
      return 'cancel';
    }
  }

  private async resumeSession(
    sessionPath: string,
    directory: string,
    ctx: ExtensionCommandContext,
  ): Promise<'session_switched' | 'cancel'> {
    ctx.ui.setStatus('file-browser', 'Switching session...');

    // Same stale-ctx rule: all post-switch work goes into withSession
    try {
      await ctx.switchSession(sessionPath, {
        withSession: async (newCtx) => {
          newCtx.ui.setStatus('file-browser', undefined);
          newCtx.ui.notify('Resumed session in ' + this.shortenPath(directory), 'info');
        },
      });
      // ctx is stale — return immediately
      return 'session_switched';
    } catch {
      // switchSession threw before replacement — ctx is still valid
      ctx.ui.notify('Failed to switch session', 'error');
      ctx.ui.setStatus('file-browser', undefined);
      return 'cancel';
    }
  }

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