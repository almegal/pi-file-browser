# pi-file-browser

A TUI file browser extension for [pi](https://github.com/earendil-works/pi-coding-agent). Navigate directories, open files for editing, and switch workspace sessions — all from within pi.

<!-- gif placeholder -->
![demo](./demo.gif)

## Install

Copy `dist/` and `src/` to `~/.pi/agent/extensions/pi-file-browser/`, then run `/reload` in pi.

## Usage

Run `/files` in pi to open the browser.

| Key | Action |
|-----|--------|
| `↑` `↓` / `j` `k` | Move selection |
| `←` / `h` | Go to parent directory |
| `→` / `l` | Enter selected directory |
| `Enter` on directory | Select directory for workspace switch |
| `Enter` on file | Open file in pi editor |
| `Esc` / `q` | Close browser |

### Directory selection

Pressing `Enter` on a directory shows a menu:

- 🆕 **New session** — create a new pi session with that directory as cwd
- 🔄 **Resume session** — switch to an existing session
- ↩ **Back** — return to the browser

### File editing

Pressing `Enter` on a file closes the browser and opens pi's built-in editor with the file contents. On save, changes are written back. On cancel, the browser reopens at the same directory.

## Build

```sh
npm run build
```

## Architecture

```
src/
├── index.ts                  # Entry point (Composition Root)
├── app/FileBrowserApp.ts     # Command registration, session logic
├── components/FileBrowserComponent.ts  # TUI rendering & input
├── handlers/NavigationInputHandler.ts   # Key → action mapping
├── interfaces/               # IFileSystemProvider, IInputHandler, IPanelModel
├── models/PanelModel.ts      # Panel state (navigation, selection)
├── providers/FileSystemProvider.ts      # Node.js fs implementation
├── services/ConfigDiscovery.ts         # Detects AGENTS.md, .pi/, etc.
└── types.ts                  # Domain types
```