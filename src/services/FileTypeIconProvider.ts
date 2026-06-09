// === FileTypeIconProvider: Maps file extensions and directory names to emoji icons ===

const EXTENSION_MAP: ReadonlyMap<string, string> = new Map([
  // Programming languages
  ['ts', '\u{1F7E6}'], ['tsx', '\u{1F7E6}'],
  ['js', '\u{1F7E2}'], ['jsx', '\u{1F7E2}'],
  ['py', '\u{1F40D}'], ['rb', '\u{1F48E}'],
  ['go', '\u{1F98B}'], ['rs', '\u{1F9E9}'],
  ['java', '\u{2615}'], ['kt', '\u{1F49C}'],
  ['swift', '\u{1F981}'], ['c', '\u{2699}'], ['cpp', '\u{2699}'], ['h', '\u{2699}'],
  ['cs', '\u{1F4A1}'], ['php', '\u{1F418}'],
  // Web / Markup
  ['html', '\u{1F310}'], ['htm', '\u{1F310}'],
  ['css', '\u{1F3A8}'], ['scss', '\u{1F3A8}'], ['less', '\u{1F3A8}'],
  ['vue', '\u{1F7E2}'], ['svelte', '\u{1F7E2}'],
  // Data / Config
  ['json', '\u{1F4E6}'], ['yaml', '\u{1F4E6}'], ['yml', '\u{1F4E6}'],
  ['toml', '\u{1F4E6}'], ['xml', '\u{1F4E6}'],
  ['csv', '\u{1F4CA}'], ['sql', '\u{1F5C3}'],
  // Documentation
  ['md', '\u{1F4DD}'], ['mdx', '\u{1F4DD}'],
  ['txt', '\u{1F4C4}'], ['rst', '\u{1F4DD}'], ['adoc', '\u{1F4DD}'],
  // Shell
  ['sh', '\u{1F4BB}'], ['bash', '\u{1F4BB}'], ['zsh', '\u{1F4BB}'],
  ['fish', '\u{1F4BB}'],
  // Build / Lock
  ['lock', '\u{1F512}'], ['map', '\u{1F5FA}'],
  // Images
  ['png', '\u{1F5BC}'], ['jpg', '\u{1F5BC}'], ['jpeg', '\u{1F5BC}'],
  ['gif', '\u{1F5BC}'], ['svg', '\u{1F3A8}'], ['webp', '\u{1F5BC}'],
  ['ico', '\u{1F5BC}'],
  // Media
  ['mp3', '\u{1F3B5}'], ['wav', '\u{1F3B5}'], ['flac', '\u{1F3B5}'],
  ['mp4', '\u{1F3AC}'], ['mkv', '\u{1F3AC}'], ['avi', '\u{1F3AC}'],
  ['mov', '\u{1F3AC}'],
  // Archives
  ['zip', '\u{1F5DC}'], ['tar', '\u{1F5DC}'], ['gz', '\u{1F5DC}'],
  ['bz2', '\u{1F5DC}'], ['7z', '\u{1F5DC}'], ['rar', '\u{1F5DC}'],
  // Fonts
  ['ttf', '\u{1F524}'], ['otf', '\u{1F524}'], ['woff', '\u{1F524}'], ['woff2', '\u{1F524}'],
  // Binary
  ['exe', '\u{26A1}'], ['dll', '\u{26A1}'], ['so', '\u{26A1}'],
  ['bin', '\u{26A1}'], ['wasm', '\u{26A1}'],
]);

const DIRECTORY_MAP: ReadonlyMap<string, string> = new Map([
  ['node_modules', '\u{1F4E6}'],
  ['src', '\u{1F4C2}'],
  ['dist', '\u{1F4E4}'],
  ['build', '\u{1F528}'],
  ['test', '\u{2705}'], ['tests', '\u{2705}'], ['__tests__', '\u{2705}'],
  ['.git', '\u{1F500}'],
  ['.github', '\u{1F500}'],
  ['.pi', '\u{1F52E}'],
  ['.agents', '\u{1F916}'],
  ['.vscode', '\u{1F4BB}'],
  ['.idea', '\u{1F4A1}'],
  ['docs', '\u{1F4DA}'],
  ['public', '\u{1F310}'],
  ['assets', '\u{1F3A8}'],
  ['config', '\u{2699}'],
  ['scripts', '\u{1F4BB}'],
  ['vendor', '\u{1F4B0}'],
  ['lib', '\u{1F4DA}'],
  ['bin', '\u{26A1}'],
]);

const DEFAULT_FILE_ICON = '\u{1F4C4}';
const DEFAULT_DIR_ICON = '\u{1F4C1}';

export class FileTypeIconProvider {
  getIcon(entry: { readonly name: string; readonly isDirectory: boolean }): string {
    if (entry.isDirectory) {
      return DIRECTORY_MAP.get(entry.name) ?? DEFAULT_DIR_ICON;
    }

    // Special filenames
    if (entry.name === 'Makefile' || entry.name === 'Dockerfile' || entry.name === 'Vagrantfile') {
      return '\u{1F528}';
    }
    if (entry.name === '.env' || entry.name.startsWith('.env.')) {
      return '\u{1F510}';
    }
    if (entry.name === '.gitignore' || entry.name === '.dockerignore') {
      return '\u{1F6AB}';
    }
    if (entry.name === 'package.json' || entry.name === 'tsconfig.json') {
      return '\u{1F4E6}';
    }
    if (entry.name === 'LICENSE' || entry.name.startsWith('LICENSE')) {
      return '\u{1F4DC}';
    }
    if (entry.name === 'README.md' || entry.name.startsWith('README')) {
      return '\u{1F4D6}';
    }

    // Extension-based
    const dotIdx = entry.name.lastIndexOf('.');
    if (dotIdx >= 0) {
      const ext = entry.name.slice(dotIdx + 1).toLowerCase();
      const icon = EXTENSION_MAP.get(ext);
      if (icon) return icon;
    }

    return DEFAULT_FILE_ICON;
  }
}
