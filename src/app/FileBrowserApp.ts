// ============================================================
// FileBrowserApp — orchestrator: wires together models, views,
// input handlers using dependency injection
// (Dependency Inversion: depends on interfaces, not concretions)
// (Single Responsibility: orchestration / coordination only)
// ============================================================

import blessed from 'blessed';
import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { IPanelModel } from '../interfaces/IPanelModel';
import { IPanelView } from '../interfaces/IPanelView';
import { IInputHandler } from '../interfaces/IInputHandler';
import { IFileBrowserApp } from '../interfaces/IFileBrowserApp';
import { PanelModel } from '../models/PanelModel';
import { PanelView } from '../views/PanelView';
import { StatusBar } from '../views/StatusBar';
import { Direction, Action, ActivePanel } from '../types';

export class FileBrowserApp implements IFileBrowserApp {
  private readonly screen: blessed.Widgets.Screen;
  private readonly leftPanel: IPanelModel;
  private readonly rightPanel: IPanelModel;
  private readonly leftView: IPanelView;
  private readonly rightView: IPanelView;
  private readonly statusBar: StatusBar;
  private readonly inputHandler: IInputHandler;
  private activePanel: ActivePanel = ActivePanel.Left;

  constructor(
    private readonly fsProvider: IFileSystemProvider,
    inputHandler: IInputHandler,
  ) {
    this.inputHandler = inputHandler;

    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Pi File Browser',
      fullUnicode: true,
    });

    // Create views (width ~50% each with 1 char gap)
    this.leftView = new PanelView(this.screen, ActivePanel.Left, 0, '50%-1');
    this.rightView = new PanelView(this.screen, ActivePanel.Right, '50%+1', '50%-1');

    // Create models
    const homeDir = this.fsProvider.getHomeDirectory();
    this.leftPanel = new PanelModel(this.fsProvider, homeDir, ActivePanel.Left);
    this.rightPanel = new PanelModel(this.fsProvider, homeDir, ActivePanel.Right);

    // Create status bar
    this.statusBar = new StatusBar(this.screen);
  }

  async start(): Promise<void> {
    // Initial load
    await this.leftPanel.refresh();
    await this.rightPanel.refresh();

    // Initial render
    this.renderAll();
    this.updateStatus();

    // Bind keys
    this.screen.key(['up', 'down', 'left', 'right', 'enter', 'escape', 'tab', 'q', 'h', 'j', 'k', 'l'], (_ch, key) => {
      this.handleInput(key.name);
    });

    // Also handle escape via raw mode
    this.screen.key(['C-c'], () => {
      this.stop();
    });


    // Wait until stopped
    await new Promise<void>((resolve) => {
      this.screen.on('destroy', () => resolve());
      this._resolveExit = resolve;
    });
  }

  private _resolveExit: (() => void) | null = null;

  stop(): void {
    this.screen.destroy();
    this._resolveExit?.();
  }

  // ---- Private helpers ----

  private get activeModel(): IPanelModel {
    return this.activePanel === ActivePanel.Left ? this.leftPanel : this.rightPanel;
  }

  private get inactiveModel(): IPanelModel {
    return this.activePanel === ActivePanel.Left ? this.rightPanel : this.leftPanel;
  }

  private get activeView(): IPanelView {
    return this.activePanel === ActivePanel.Left ? this.leftView : this.rightView;
  }

  private get inactiveView(): IPanelView {
    return this.activePanel === ActivePanel.Left ? this.rightView : this.leftView;
  }

  private handleInput(keyName: string): void {
    const input = this.inputHandler.handleKey(keyName);
    if (input === null) return;

    if (input === Direction.Up) {
      this.activeModel.moveUp();
    } else if (input === Direction.Down) {
      this.activeModel.moveDown();
    } else if (input === Direction.Left) {
      // Go up to parent directory
      this.activeModel.goUp().then(() => this.renderAll());
      return; // async render handled in promise
    } else if (input === Direction.Right) {
      // Enter directory
      this.activeModel.goInto().then(() => this.renderAll());
      return;
    } else if (input === Action.Enter) {
      // Also enter directory
      this.activeModel.goInto().then(() => this.renderAll());
      return;
    } else if (input === Action.Tab) {
      // Switch active panel
      this.activePanel = this.activePanel === ActivePanel.Left
        ? ActivePanel.Right
        : ActivePanel.Left;
    } else if (input === Action.Escape) {
      this.stop();
      return;
    }

    this.renderAll();
  }

  private renderAll(): void {
    this.activeView.render(
      this.activeModel.entries,
      this.activeModel.selectedIndex,
      this.activeModel.currentPath,
      true,
    );
    this.inactiveView.render(
      this.inactiveModel.entries,
      this.inactiveModel.selectedIndex,
      this.inactiveModel.currentPath,
      false,
    );
    this.updateStatus();
  }

  private updateStatus(): void {
    const selected = this.activeModel.entries[this.activeModel.selectedIndex];
    const selInfo = selected
      ? `${selected.isDirectory ? 'DIR' : 'FILE'} ${selected.name}`
      : '(empty)';
    const panelLabel = this.activePanel === ActivePanel.Left ? 'LEFT' : 'RIGHT';
    this.statusBar.render(
      ` {bold}[${panelLabel}]{/bold} ${selInfo} ` +
      `│ ↑↓: Move │ ←: Back │ →/Enter: Open │ Tab: Switch │ Esc: Exit `,
    );
  }
}