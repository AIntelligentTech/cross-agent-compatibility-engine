/**
 * Constants for the Cross-Agent Compatibility Engine
 */

import type { AgentId, ComponentType } from './types.js';

// ============================================================================
// Agent Metadata
// ============================================================================

export interface AgentInfo {
  id: AgentId;
  displayName: string;
  componentTypes: ComponentType[];
  fileExtension: string;
  configLocations: {
    project: string;
    user: string;
  };
}

export const AGENTS: Record<AgentId, AgentInfo> = {
  claude: {
    id: 'claude',
    displayName: 'Claude Code',
    componentTypes: ['skill', 'hook', 'memory', 'rule', 'agent', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.claude/skills',
      user: '~/.claude/skills',
    },
  },
  windsurf: {
    id: 'windsurf',
    displayName: 'Windsurf (Cascade)',
    componentTypes: ['skill', 'workflow', 'rule', 'memory', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.windsurf/workflows',
      user: '~/.windsurf/workflows',
    },
  },
  cursor: {
    id: 'cursor',
    displayName: 'Cursor',
    componentTypes: ['skill', 'command', 'rule', 'memory', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.cursor',
      user: '~/.cursor',
    },
  },
  gemini: {
    id: 'gemini',
    displayName: 'Gemini CLI',
    componentTypes: ['skill', 'command', 'memory', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.gemini',
      user: '~/.gemini',
    },
  },
  universal: {
    id: 'universal',
    displayName: 'Universal (AGENTS.md)',
    componentTypes: ['memory'],
    fileExtension: '.md',
    configLocations: {
      project: '.',
      user: '~',
    },
  },
  opencode: {
    id: 'opencode',
    displayName: 'OpenCode',
    componentTypes: ['skill', 'command', 'memory', 'agent', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.opencode',
      user: '~/.config/opencode',
    },
  },
  codex: {
    id: 'codex',
    displayName: 'OpenAI Codex',
    componentTypes: ['skill', 'command', 'memory', 'rule', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.codex/skills',
      user: '~/.codex',
    },
  },
  aider: {
    id: 'aider',
    displayName: 'Aider',
    componentTypes: ['command', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.aider/commands',
      user: '~/.aider/commands',
    },
  },
  continue: {
    id: 'continue',
    displayName: 'Continue',
    componentTypes: ['command', 'config'],
    fileExtension: '.md',
    configLocations: {
      project: '.continue/commands',
      user: '~/.continue/commands',
    },
  },
};

// ============================================================================
// Component Type Mappings
// ============================================================================

export const COMPONENT_TYPE_EQUIVALENTS: Record<ComponentType, Partial<Record<AgentId, ComponentType>>> = {
  skill: {
    claude: 'skill',
    windsurf: 'workflow',
    cursor: 'command',
    codex: 'skill',
    gemini: 'skill',
  },
  workflow: {
    claude: 'skill',
    windsurf: 'workflow',
    cursor: 'command',
    codex: 'skill',
    gemini: 'skill',
  },
  command: {
    claude: 'skill',
    windsurf: 'workflow',
    cursor: 'command',
    codex: 'command',
    gemini: 'command',
  },
  rule: {
    windsurf: 'rule',
    codex: 'rule',
  },
  hook: {
    claude: 'hook',
  },
  memory: {
    claude: 'memory',
    windsurf: 'memory',
    codex: 'memory',
    gemini: 'memory',
  },
  agent: {
    claude: 'agent',
  },
  config: {
    claude: 'config',
    windsurf: 'config',
    cursor: 'config',
  },
};

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_VERSION = { major: 1, minor: 0, patch: 0 };

export const SUPPORTED_AGENTS: AgentId[] = ['claude', 'windsurf', 'cursor', 'opencode', 'gemini', 'codex', 'universal'];

// ============================================================================
// File Patterns
// ============================================================================

export const AGENT_FILE_PATTERNS: Record<AgentId, RegExp[]> = {
  claude: [
    /\.claude\/skills\/.*\/SKILL\.md$/,
    /\.claude\/commands\/.*\.md$/,
    /CLAUDE\.md$/,
    /CLAUDE\.local\.md$/,
    /\.claude\/rules\/.*\.md$/,
  ],
  windsurf: [
    /\.windsurf\/workflows\/.*\.md$/,
    /\.windsurf\/rules\/.*\.md$/,
    /\.windsurf\/skills\/.*\/SKILL\.md$/,
  ],
  cursor: [
    /\.cursor\/commands\/.*\.md$/,
    /\.cursor\/rules\/.*\.mdc?$/,
  ],
  gemini: [
    /GEMINI\.md$/,
    /\.gemini\/GEMINI\.md$/,
  ],
  universal: [
    /AGENTS\.md$/,
  ],
  opencode: [
    /\.opencode\/skills\/.*\/SKILL\.md$/,
    /\.opencode\/commands\/.*\.md$/,
    /\.opencode\/agents\/.*\.md$/,
    /AGENTS\.md$/,
  ],
  aider: [
    /\.aider\/commands\/.*\.md$/,
  ],
  continue: [
    /\.continue\/commands\/.*\.md$/,
  ],
  codex: [
    /\.codex\/skills\/.*\/SKILL\.md$/,
    /\.codex\/.*\.md$/,
    /CODEX\.md$/,
  ],
};
