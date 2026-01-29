/**
 * Version catalog containing version definitions for all supported agents
 */

import type { AgentId } from "../core/types.js";
import type {
  VersionCatalogEntry,
  FeatureFlag,
  BreakingChange,
} from "./types.js";

// ============================================================================
// Claude Code Versions
// ============================================================================

export const CLAUDE_FEATURES: FeatureFlag[] = [
  {
    id: "claude-skills",
    name: "Skills",
    description: "Reusable skill definitions in .claude/skills/",
    introducedIn: "1.0",
  },
  {
    id: "claude-commands",
    name: "Commands",
    description: "Custom slash commands in .claude/commands/",
    introducedIn: "1.0",
  },
  {
    id: "claude-hooks",
    name: "Hooks",
    description: "Lifecycle hooks for tool events",
    introducedIn: "1.5",
  },
  {
    id: "claude-rules",
    name: "Rules",
    description: "Path-specific rules in .claude/rules/",
    introducedIn: "2.0",
  },
  {
    id: "claude-subagents",
    name: "Sub-agents",
    description: "Agent field for delegating to specialized sub-agents",
    introducedIn: "1.5",
  },
  {
    id: "claude-fork-context",
    name: "Fork Context",
    description: "Fork execution context for isolated runs",
    introducedIn: "1.0",
  },
  {
    id: "claude-allowed-tools",
    name: "Allowed Tools",
    description: "Tool restriction list in frontmatter",
    introducedIn: "1.0",
  },
  {
    id: "claude-model-selection",
    name: "Model Selection",
    description: "Model field for specifying preferred model",
    introducedIn: "1.5",
  },
  {
    id: "claude-background-agents",
    name: "Background Agents",
    description: "Background agent execution",
    introducedIn: "2.0",
  },
  {
    id: "claude-memory-imports",
    name: "Memory Imports",
    description: "@import syntax in CLAUDE.md files",
    introducedIn: "1.0",
  },
];

export const CLAUDE_BREAKING_CHANGES: BreakingChange[] = [
  {
    id: "claude-rules-location",
    type: "location_changed",
    version: "2.0",
    description:
      "Rules moved from inline CLAUDE.md to .claude/rules/ directory",
    affected: "rules",
    migration:
      "Extract rules from CLAUDE.md into separate .md files in .claude/rules/",
    autoMigratable: false,
  },
  {
    id: "claude-hooks-format",
    type: "format_changed",
    version: "1.5",
    description: "Hooks configuration moved to settings.json",
    affected: "hooks",
    migration: "Move hook definitions to .claude/settings.json hooks array",
    autoMigratable: false,
  },
];

export const CLAUDE_VERSIONS: VersionCatalogEntry[] = [
  {
    agent: "claude",
    version: "1.0",
    semver: { major: 1, minor: 0, patch: 0 },
    releaseDate: "2025-02-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "claude-skills",
      "claude-commands",
      "claude-fork-context",
      "claude-allowed-tools",
      "claude-memory-imports",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "field_absent",
        field: "agent",
        weight: 3,
        indicatesVersionOrLater: false,
      },
      {
        type: "field_absent",
        field: "model",
        weight: 2,
        indicatesVersionOrLater: false,
      },
    ],
  },
  {
    agent: "claude",
    version: "1.5",
    semver: { major: 1, minor: 5, patch: 0 },
    releaseDate: "2025-06-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "claude-hooks",
      "claude-subagents",
      "claude-model-selection",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: ["claude-hooks-format"],
    detectionMarkers: [
      {
        type: "field_present",
        field: "agent",
        weight: 5,
        indicatesVersionOrLater: true,
      },
      {
        type: "field_present",
        field: "model",
        weight: 3,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "claude",
    version: "2.0",
    semver: { major: 2, minor: 0, patch: 0 },
    releaseDate: "2025-12-01",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: ["claude-rules", "claude-background-agents"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: ["claude-rules-location"],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.claude/rules/.*\\.md$",
        weight: 10,
        indicatesVersionOrLater: true,
      },
    ],
  },
];

// ============================================================================
// Windsurf Versions
// ============================================================================

export const WINDSURF_FEATURES: FeatureFlag[] = [
  {
    id: "windsurf-workflows",
    name: "Workflows",
    description: "Workflow definitions in .windsurf/workflows/",
    introducedIn: "wave-1",
  },
  {
    id: "windsurf-rules",
    name: "Rules",
    description: "Rule definitions in .windsurf/rules/",
    introducedIn: "wave-1",
  },
  {
    id: "windsurf-auto-execution",
    name: "Auto Execution Mode",
    description: "auto_execution_mode field for activation control",
    introducedIn: "wave-8",
  },
  {
    id: "windsurf-agent-skills",
    name: "Agent Skills",
    description: "Agent Skills support for Cascade",
    introducedIn: "wave-10",
  },
  {
    id: "windsurf-parallel-sessions",
    name: "Parallel Sessions",
    description: "Multi-agent parallel sessions with Git worktrees",
    introducedIn: "wave-13",
  },
  {
    id: "windsurf-browser-preview",
    name: "Browser Preview",
    description: "In-IDE browser preview for web apps",
    introducedIn: "wave-11",
  },
  {
    id: "windsurf-voice-input",
    name: "Voice Input",
    description: "Voice-to-text input for Cascade chat",
    introducedIn: "wave-12",
  },
];

export const WINDSURF_BREAKING_CHANGES: BreakingChange[] = [
  {
    id: "windsurf-skills-location",
    type: "location_changed",
    version: "wave-10",
    description: "Skills moved to .windsurf/skills/ directory structure",
    affected: "skills",
    migration: "Move skill files to .windsurf/skills/<name>/SKILL.md format",
    autoMigratable: true,
    transformFn: "migrateWindsurfSkillLocation",
  },
];

export const WINDSURF_VERSIONS: VersionCatalogEntry[] = [
  {
    agent: "windsurf",
    version: "wave-1",
    releaseDate: "2024-11-01",
    isCurrent: false,
    isSupported: false,
    featuresIntroduced: ["windsurf-workflows", "windsurf-rules"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "field_absent",
        field: "auto_execution_mode",
        weight: 3,
        indicatesVersionOrLater: false,
      },
    ],
  },
  {
    agent: "windsurf",
    version: "wave-8",
    releaseDate: "2025-03-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-auto-execution"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "field_present",
        field: "auto_execution_mode",
        weight: 5,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "windsurf",
    version: "wave-10",
    releaseDate: "2025-06-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-agent-skills"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: ["windsurf-skills-location"],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.windsurf/skills/.*\\.md$",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "windsurf",
    version: "wave-13",
    releaseDate: "2025-12-01",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: ["windsurf-parallel-sessions"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
];

// ============================================================================
// Cursor Versions
// ============================================================================

export const CURSOR_FEATURES: FeatureFlag[] = [
  {
    id: "cursor-cursorrules",
    name: ".cursorrules",
    description: "Repository-level AI rules in .cursorrules file",
    introducedIn: "0.34",
    deprecatedIn: "1.7",
  },
  {
    id: "cursor-commands",
    name: "Custom Commands",
    description: "Custom slash commands in .cursor/commands/",
    introducedIn: "1.6",
  },
  {
    id: "cursor-mdc-rules",
    name: "MDC Rules",
    description: "Rules in .cursor/rules/*.mdc format",
    introducedIn: "1.7",
  },
  {
    id: "cursor-hooks",
    name: "Hooks",
    description: "Custom scripts for agent behavior control",
    introducedIn: "1.7",
  },
  {
    id: "cursor-background-agents",
    name: "Background Agents",
    description: "Autonomous background agent execution",
    introducedIn: "0.50",
  },
  {
    id: "cursor-linear-integration",
    name: "Linear Integration",
    description: "Launch agents from Linear issue tickets",
    introducedIn: "1.5",
  },
  {
    id: "cursor-debug-mode",
    name: "Debug Mode",
    description: "Human-in-the-loop debugging workflow",
    introducedIn: "2.2",
  },
  {
    id: "cursor-agent-autocomplete",
    name: "Agent Autocomplete",
    description: "Command suggestions for agents",
    introducedIn: "1.7",
  },
];

export const CURSOR_BREAKING_CHANGES: BreakingChange[] = [
  {
    id: "cursor-rules-migration",
    type: "location_changed",
    version: "1.7",
    description: ".cursorrules deprecated in favor of .cursor/rules/*.mdc",
    affected: ".cursorrules",
    migration: "Move .cursorrules content to .cursor/rules/default.mdc",
    autoMigratable: true,
    transformFn: "migrateCursorRules",
  },
  {
    id: "cursor-mdc-format",
    type: "format_changed",
    version: "1.7",
    description: "Rules now use .mdc format with frontmatter",
    affected: "rules",
    migration: "Add YAML frontmatter to rule files and rename to .mdc",
    autoMigratable: true,
    transformFn: "convertToMdcFormat",
  },
];

export const CURSOR_VERSIONS: VersionCatalogEntry[] = [
  {
    agent: "cursor",
    version: "0.34",
    semver: { major: 0, minor: 34, patch: 0 },
    releaseDate: "2024-04-01",
    isCurrent: false,
    isSupported: false,
    featuresIntroduced: ["cursor-cursorrules"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "^\\.cursorrules$",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "cursor",
    version: "0.50",
    semver: { major: 0, minor: 50, patch: 0 },
    releaseDate: "2025-01-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-background-agents"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "1.6",
    semver: { major: 1, minor: 6, patch: 0 },
    releaseDate: "2025-06-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-commands"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.cursor/commands/.*\\.md$",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "cursor",
    version: "1.7",
    semver: { major: 1, minor: 7, patch: 0 },
    releaseDate: "2025-08-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "cursor-mdc-rules",
      "cursor-hooks",
      "cursor-agent-autocomplete",
    ],
    featuresDeprecated: ["cursor-cursorrules"],
    featuresRemoved: [],
    breakingChanges: ["cursor-rules-migration", "cursor-mdc-format"],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.cursor/rules/.*\\.mdc$",
        weight: 10,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "cursor",
    version: "2.2",
    semver: { major: 2, minor: 2, patch: 0 },
    releaseDate: "2025-11-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-debug-mode"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "2.3",
    semver: { major: 2, minor: 3, patch: 0 },
    releaseDate: "2025-12-22",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
];

// ============================================================================
// Catalog Access Functions
// ============================================================================

const ALL_VERSIONS: VersionCatalogEntry[] = [
  ...CLAUDE_VERSIONS,
  ...WINDSURF_VERSIONS,
  ...CURSOR_VERSIONS,
];

const ALL_FEATURES: Record<AgentId, FeatureFlag[]> = {
  claude: CLAUDE_FEATURES,
  windsurf: WINDSURF_FEATURES,
  cursor: CURSOR_FEATURES,
  gemini: [],
  codex: [],
  universal: [],
  opencode: [],
  aider: [],
  continue: [],
};

const ALL_BREAKING_CHANGES: Record<AgentId, BreakingChange[]> = {
  claude: CLAUDE_BREAKING_CHANGES,
  windsurf: WINDSURF_BREAKING_CHANGES,
  cursor: CURSOR_BREAKING_CHANGES,
  gemini: [],
  codex: [],
  universal: [],
  opencode: [],
  aider: [],
  continue: [],
};

/**
 * Get all versions for an agent
 */
export function getAgentVersions(agent: AgentId): VersionCatalogEntry[] {
  return ALL_VERSIONS.filter((v) => v.agent === agent);
}

/**
 * Get the current/latest version for an agent
 */
export function getCurrentVersion(
  agent: AgentId,
): VersionCatalogEntry | undefined {
  return ALL_VERSIONS.find((v) => v.agent === agent && v.isCurrent);
}

/**
 * Get a specific version entry
 */
export function getVersion(
  agent: AgentId,
  version: string,
): VersionCatalogEntry | undefined {
  return ALL_VERSIONS.find((v) => v.agent === agent && v.version === version);
}

/**
 * Get all features for an agent
 */
export function getAgentFeatures(agent: AgentId): FeatureFlag[] {
  return ALL_FEATURES[agent] ?? [];
}

/**
 * Get a specific feature
 */
export function getFeature(
  agent: AgentId,
  featureId: string,
): FeatureFlag | undefined {
  return (ALL_FEATURES[agent] ?? []).find((f) => f.id === featureId);
}

/**
 * Check if a feature is available in a version
 */
export function isFeatureAvailable(
  agent: AgentId,
  featureId: string,
  version: string,
): boolean {
  const feature = getFeature(agent, featureId);
  if (!feature) return false;

  const versions = getAgentVersions(agent);
  const featureVersion = versions.find(
    (v) => v.version === feature.introducedIn,
  );
  const targetVersion = versions.find((v) => v.version === version);

  if (!featureVersion || !targetVersion) return false;

  const featureIndex = versions.indexOf(featureVersion);
  const targetIndex = versions.indexOf(targetVersion);

  // Feature is available if target version is at or after introduction
  if (targetIndex < featureIndex) return false;

  // Check if feature was removed before target version
  if (feature.removedIn) {
    const removedVersion = versions.find(
      (v) => v.version === feature.removedIn,
    );
    if (removedVersion) {
      const removedIndex = versions.indexOf(removedVersion);
      if (targetIndex >= removedIndex) return false;
    }
  }

  return true;
}

/**
 * Get all breaking changes for an agent
 */
export function getBreakingChanges(agent: AgentId): BreakingChange[] {
  return ALL_BREAKING_CHANGES[agent] ?? [];
}

/**
 * Get breaking changes between two versions
 */
export function getBreakingChangesBetween(
  agent: AgentId,
  fromVersion: string,
  toVersion: string,
): BreakingChange[] {
  const versions = getAgentVersions(agent);
  const fromIndex = versions.findIndex((v) => v.version === fromVersion);
  const toIndex = versions.findIndex((v) => v.version === toVersion);

  if (fromIndex === -1 || toIndex === -1) return [];

  const relevantVersions = versions.slice(
    Math.min(fromIndex, toIndex) + 1,
    Math.max(fromIndex, toIndex) + 1,
  );

  const breakingChangeIds = relevantVersions.flatMap((v) => v.breakingChanges);
  const allChanges = getBreakingChanges(agent);

  return allChanges.filter((c) => breakingChangeIds.includes(c.id));
}

/**
 * Compare two versions (returns -1, 0, or 1)
 */
export function compareVersions(
  agent: AgentId,
  v1: string,
  v2: string,
): number {
  const versions = getAgentVersions(agent);
  const i1 = versions.findIndex((v) => v.version === v1);
  const i2 = versions.findIndex((v) => v.version === v2);

  if (i1 === -1 || i2 === -1) return 0;
  if (i1 < i2) return -1;
  if (i1 > i2) return 1;
  return 0;
}

/**
 * Get version info summary for display
 */
export function getVersionSummary(agent: AgentId): {
  agent: AgentId;
  versions: Array<{
    version: string;
    isCurrent: boolean;
    isSupported: boolean;
  }>;
  currentVersion: string | undefined;
  totalFeatures: number;
  totalBreakingChanges: number;
} {
  const versions = getAgentVersions(agent);
  const current = getCurrentVersion(agent);

  return {
    agent,
    versions: versions.map((v) => ({
      version: v.version,
      isCurrent: v.isCurrent,
      isSupported: v.isSupported,
    })),
    currentVersion: current?.version,
    totalFeatures: getAgentFeatures(agent).length,
    totalBreakingChanges: getBreakingChanges(agent).length,
  };
}
