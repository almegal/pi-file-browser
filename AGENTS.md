# Repository Guidelines

## Project Structure & Module Organization

```
pi-file-browser/
├── src/
│   ├── index.ts              # Extension entry point (Composition Root)
│   ├── app/
│   │   └── FileBrowserApp.ts # Orchestrator — registers /files command, handles session switching
│   ├── components/
│   │   └── FileBrowserComponent.ts # TUI rendering + input handling + theme integration
│   ├── handlers/
│   │   └── NavigationInputHandler.ts # Key → Direction/Action mapping
│   ├── interfaces/
│   │   ├── IFileSystemProvider.ts    # Filesystem abstraction (listDirectory with showHidden option)
│   │   ├── IInputHandler.ts          # Input handler interface
│   │   └── IPanelModel.ts           # Panel state interface (navigation, selection, search, showHidden)
│   ├── models/
│   │   └── PanelModel.ts       # Panel state (navigation, selection, search filter, hidden toggle)
│   ├── providers/
│   │   └── FileSystemProvider.ts # Node.js fs implementation
│   ├── services/
│   │   ├── ConfigDiscovery.ts   # Detects AGENTS.md, .pi/, .agents/ configs
│   │   └── FileTypeIconProvider.ts # Extension/directory → emoji icon mapping (60+ rules)
│   └── types.ts                # Domain enums (Direction, Action, BrowserMode) & interfaces
├── dist/                       # Compiled output (gitignored)
├── package.json
└── tsconfig.json
```

Architecture follows **Single Responsibility** per file and **Composition Root** for DI. Interfaces (`I*`) define contracts; models and providers implement them. The component never imports Node APIs directly — filesystem access goes through `IFileSystemProvider`.

**Theme integration:** `FileBrowserComponent` receives a `Theme` object (from `@earendil-works/pi-coding-agent`) via the `ctx.ui.custom()` callback. All visual styling uses `theme.fg()` / `theme.bg()` — never hardcoded ANSI escape codes. `invalidate()` clears the render cache so theme hot-reload takes effect.

## Feature: Toggle Hidden Files

Press **`.`** to toggle visibility of dotfiles and dot-directories. `PanelModel.showHidden` stores the state; `toggleHidden()` re-reads the directory via `IFileSystemProvider.listDirectory(path, { showHidden })`. The status bar shows a `[hidden]` marker (themed with `dim`) when hidden files are visible. The hints bar shows `.=hidden` (when hidden) or `A=hidden` (when shown).

## Feature: Smart File-Type Icons

`FileTypeIconProvider` maps file extensions, special filenames, and directory names to context-aware emoji icons. 60+ extension rules, 10+ special filename rules (`Makefile`, `.env`, `README.md`, `LICENSE`), and 15+ directory rules (`node_modules`, `src`, `.git`, `.pi`, `tests`). The component calls `iconProvider.getIcon(entry)` instead of hardcoding 📂/📄.

## Feature: Type-to-Filter Search

Press **`/`** or start typing a printable character to activate search. `PanelModel.setSearchQuery()` filters `_allEntries` by substring match (case-insensitive). Results sort directories first, then prefix matches before substring matches, then alphabetically. `Enter` confirms selection, `Esc` cancels and restores previous position, `Backspace` deletes last char or exits search.

## Feature: Directory Workspace Switching

When the user presses **Enter** on a directory in the file browser:
1. Browser closes and returns the selected directory path
2. Existing pi sessions for that directory are discovered via `SessionManager.list()`
3. Local config files (AGENTS.md, .pi/, etc.) are detected
4. A selection dialog shows options:
   - 🆕 **New session** — creates a new pi session with that directory as cwd
   - 🔄 **Resume session** — switches to an existing session (shown for recent sessions)
   - ↩ **Cancel** — stay in current session

When switching to a directory, pi automatically discovers and loads local configs (AGENTS.md, .pi/, .agents/) from that directory's cwd.

**Key arrow**: Enter = select directory for workspace, → = navigate into (browse).

## Build, Test, and Development Commands

- **`npm run build`** (`tsc`) — compile TypeScript to `dist/`. Always run after source changes.
- **`npm start`** (`node dist/index.js`) — entry point for standalone execution (not typical; normally loaded as a pi extension).

To test within pi, copy `dist/` and `src/` to `~/.pi/agent/extensions/pi-file-browser/` and run `/reload` in the TUI, then invoke `/files`.

There are no automated tests yet. When adding tests, place them in a `test/` directory mirroring `src/`.

## Coding Style & Naming Conventions

- **Language:** TypeScript, strict mode (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`).
- **Indentation:** 2 spaces.
- **Naming:** `PascalCase` for classes/interfaces/types/enums, `camelCase` for functions/variables, `UPPER_SNAKE` for enum values. Interfaces prefixed with `I` (e.g., `IPanelModel`).
- **File naming:** `PascalCase.ts` — one class/interface per file, filename matches the export.
- **Exports:** Use named exports; the extension entry point uses `export default function`.
- **Comments:** Each file starts with a `// ===` header block stating responsibility.
- **ANSI rendering:** Always use `truncateToWidth()` and `visibleWidth()` from `@earendil-works/pi-tui` when constructing TUI output. Never assume fixed-width padding — always pad to computed `panelWidth`.
- **Theme usage:** Never use hardcoded ANSI escapes (`\x1b[1m`, `\x1b[7m`, `\x1b[2m`). Always style text via `theme.fg()` and `theme.bg()` from the `Theme` object passed into `FileBrowserComponent`.

## Commit & Pull Request Guidelines

Use **conventional commit** format:

```
feat: short description
fix: short description
refactor: short description
```

Keep commits focused — one logical change per commit. PRs should include a description of the change and how it was verified (manual TUI test, etc.).