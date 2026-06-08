import { IFileSystemProvider } from '../interfaces/IFileSystemProvider';
import { DirectoryConfigInfo } from '../types';
import path from 'path';

export class ConfigDiscovery {
  constructor(private readonly fsProvider: IFileSystemProvider) {}

  async discover(directory: string): Promise<DirectoryConfigInfo> {
    const checks = [
      { name: 'AGENTS.md', path: path.join(directory, 'AGENTS.md') },
      { name: 'CLAUDE.md', path: path.join(directory, 'CLAUDE.md') },
      { name: '.pi/', path: path.join(directory, '.pi') },
      { name: '.agents/', path: path.join(directory, '.agents') },
    ];

    const results = await Promise.all(
      checks.map(async (check) => ({
        ...check,
        exists: await this.fsProvider.exists(check.path),
      })),
    );

    const configItems = results.filter((r) => r.exists).map((r) => r.name);

    const hasAgentsMd = results.find((r) => r.name === 'AGENTS.md')!.exists;
    const hasClaudeMd = results.find((r) => r.name === 'CLAUDE.md')!.exists;
    const hasPiDir = results.find((r) => r.name === '.pi/')!.exists;
    const hasAgentsDir = results.find((r) => r.name === '.agents/')!.exists;

    const description = configItems.length > 0
      ? `Config: ${configItems.join(', ')}`
      : 'No local config';

    return { directory, hasAgentsMd, hasClaudeMd, hasPiDir, hasAgentsDir, configItems, description };
  }
}