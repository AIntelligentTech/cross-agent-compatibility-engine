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
    description: "Fork execution context for isolated runs (/fork command, later renamed /branch)",
    introducedIn: "2.1",
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
  {
    id: "claude-named-subagents",
    name: "Named Sub-agents",
    description: "Named subagents with @ mention typeahead",
    introducedIn: "2.1",
  },
  {
    id: "claude-plugins",
    name: "Plugins",
    description: "Plugin executables under bin/",
    introducedIn: "2.1",
  },
  {
    id: "claude-mcp-persistence",
    name: "MCP Result Persistence",
    description: "MCP result persistence up to 500K",
    introducedIn: "2.1",
  },
  {
    id: "claude-powershell",
    name: "PowerShell Tool",
    description: "PowerShell tool for Windows",
    introducedIn: "2.1",
  },
  {
    id: "claude-skill-hooks",
    name: "Skill Hooks",
    description: "Hooks scoped to skill lifecycle",
    introducedIn: "2.1",
  },
  {
    id: "claude-conditional-hooks",
    name: "Conditional Hooks",
    description: "Conditional if field for hooks",
    introducedIn: "2.1",
  },
  {
    id: "claude-effort-levels",
    name: "Effort Levels",
    description: "Effort level control (low/medium/high/max)",
    introducedIn: "2.1",
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
  {
    id: "claude-commands-merged",
    type: "behavior_changed",
    version: "2.1",
    description:
      "Commands merged into skills (.claude/commands/ still works as alias)",
    affected: "commands",
    migration:
      "Commands in .claude/commands/ continue to work as an alias; migrate to skills for new functionality",
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
    isCurrent: false,
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
  {
    agent: "claude",
    version: "2.1",
    semver: { major: 2, minor: 1, patch: 0 },
    releaseDate: "2026-02-18",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [
      "claude-named-subagents",
      "claude-plugins",
      "claude-mcp-persistence",
      "claude-powershell",
      "claude-skill-hooks",
      "claude-conditional-hooks",
      "claude-effort-levels",
      "claude-fork-context",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: ["claude-commands-merged"],
    detectionMarkers: [
      {
        type: "field_present",
        field: "effort",
        weight: 6,
        indicatesVersionOrLater: true,
      },
      {
        type: "field_present",
        field: "shell",
        weight: 4,
        indicatesVersionOrLater: true,
      },
      {
        type: "field_present",
        field: "context",
        weight: 6,
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
  {
    id: "windsurf-arena-mode",
    name: "Arena Mode",
    description: "Side-by-side blind model comparison with voting",
    introducedIn: "wave-14",
  },
  {
    id: "windsurf-plan-mode",
    name: "Plan Mode",
    description: "Implementation plans before coding including megaplan",
    introducedIn: "wave-14",
  },
  {
    id: "windsurf-agents-skills",
    name: "Agents Skills Directory",
    description: "Reading .agents/skills/ directory",
    introducedIn: "wave-14",
  },
  {
    id: "windsurf-cascade-transcript-hook",
    name: "Cascade Transcript Hook",
    description: "POST_CASCADE_RESPONSE_WITH_TRANSCRIPT hook",
    introducedIn: "wave-14",
  },
  {
    id: "windsurf-worktree-hook",
    name: "Worktree Hook",
    description: "post_setup_worktree hook",
    introducedIn: "wave-14",
  },
  {
    id: "windsurf-claude-compat",
    name: "Claude Code Compatibility",
    description: "readClaudeCodeConfig flag for .claude/skills/ reading",
    introducedIn: "wave-14",
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
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-parallel-sessions"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "wave-14",
    releaseDate: "2026-01-30",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [
      "windsurf-arena-mode",
      "windsurf-plan-mode",
      "windsurf-agents-skills",
      "windsurf-cascade-transcript-hook",
      "windsurf-worktree-hook",
      "windsurf-claude-compat",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.agents/skills/",
        weight: 6,
        indicatesVersionOrLater: true,
      },
    ],
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
    id: "cursor-skills",
    name: "Agent Skills",
    description:
      "Agent Skills standard (.cursor/skills/<name>/SKILL.md)",
    introducedIn: "2.4",
  },
  {
    id: "cursor-agent-autocomplete",
    name: "Agent Autocomplete",
    description: "Command suggestions for agents",
    introducedIn: "1.7",
  },
  {
    id: "cursor-automations",
    name: "Automations",
    description:
      "Always-on agents triggered by Slack/Linear/GitHub/PagerDuty/webhooks",
    introducedIn: "2.5",
  },
  {
    id: "cursor-marketplace-plugins",
    name: "Marketplace Plugins",
    description: "30+ marketplace plugins with MCP",
    introducedIn: "2.5",
  },
  {
    id: "cursor-self-hosted-agents",
    name: "Self-Hosted Agents",
    description: "Self-hosted cloud agents on own infrastructure",
    introducedIn: "2.5",
  },
  {
    id: "cursor-worktrees",
    name: "Worktrees",
    description: "/worktree command for isolated git worktrees",
    introducedIn: "3.0",
  },
  {
    id: "cursor-best-of-n",
    name: "Best-of-N",
    description: "/best-of-n parallel multi-model comparison",
    introducedIn: "3.0",
  },
  {
    id: "cursor-agents-window",
    name: "Agents Window",
    description: "Agents Window for parallel agents across repos/environments",
    introducedIn: "3.0",
  },
  {
    id: "cursor-design-mode",
    name: "Design Mode",
    description: "Annotate UI elements in browser",
    introducedIn: "3.0",
  },
  {
    id: "cursor-await-tool",
    name: "Await Tool",
    description: "Await tool for monitoring long-running jobs",
    introducedIn: "3.0",
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
  {
    id: "cursor-cloud-agents-removed",
    type: "field_removed",
    version: "3.0",
    description: "Cloud agents removed from Editor in 3.0",
    affected: "cloud agents",
    migration:
      "Use self-hosted agents (cursor-self-hosted-agents) or the new Agents Window (cursor-agents-window) instead",
    autoMigratable: false,
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
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "2.4",
    semver: { major: 2, minor: 4, patch: 0 },
    releaseDate: "2026-01-22",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-skills"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.cursor/skills/[^/]+/SKILL\\.md$",
        weight: 10,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "cursor",
    version: "2.5",
    semver: { major: 2, minor: 5, patch: 0 },
    releaseDate: "2026-03-05",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "cursor-automations",
      "cursor-marketplace-plugins",
      "cursor-self-hosted-agents",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "3.0",
    semver: { major: 3, minor: 0, patch: 0 },
    releaseDate: "2026-04-02",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [
      "cursor-worktrees",
      "cursor-best-of-n",
      "cursor-agents-window",
      "cursor-design-mode",
      "cursor-await-tool",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: ["cursor-cloud-agents-removed"],
    detectionMarkers: [
      {
        type: "field_present",
        field: "worktree",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
];

// ============================================================================
// Codex Compatibility Epochs
// ============================================================================
//
// IMPORTANT: these are CACE internal compatibility epochs, not official Codex
// CLI vendor semver releases. Codex's public release train is still 0.x (latest
// 0.120.0 as of April 11, 2026). CACE uses a smaller set of milestones (1.0/
// 1.1/1.2) for migration and adaptation logic. See
// docs/research/repo-audit-2026-04-11.md for the audit reframe.

export const CODEX_FEATURES: FeatureFlag[] = [
  {
    id: "codex-ga",
    name: "Feature Maturity",
    description: "Codex matures as a stable product surface (npm versioning remains 0.x)",
    introducedIn: "1.0",
  },
  {
    id: "codex-agent-skills",
    name: "Agent Skills",
    description: "Skill definitions in .agents/skills/<name>/SKILL.md",
    introducedIn: "1.1",
  },
  {
    id: "codex-agents-guidance",
    name: "AGENTS.md Guidance Chain",
    description: "Hierarchical project guidance via AGENTS.md and AGENTS.override.md",
    introducedIn: "1.2",
  },
  {
    id: "codex-team-config",
    name: "Team Config",
    description: "Shared configuration via Codex home and team-level settings",
    introducedIn: "1.2",
  },
];

export const CODEX_BREAKING_CHANGES: BreakingChange[] = [
  {
    id: "codex-custom-prompts-deprecated",
    type: "behavior_changed",
    version: "1.2",
    description: "Custom prompts are deprecated in favor of AGENTS.md guidance and team config",
    affected: "custom prompts",
    migration:
      "Move durable project guidance into AGENTS.md or AGENTS.override.md and use team config for shared defaults",
    autoMigratable: false,
  },
];

export const CODEX_VERSIONS: VersionCatalogEntry[] = [
  {
    agent: "codex",
    version: "1.0",
    semver: { major: 1, minor: 0, patch: 0 },
    releaseDate: "2025-10-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["codex-ga"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "field_present",
        field: "approval_policy",
        weight: 4,
        indicatesVersionOrLater: true,
      },
      {
        type: "field_present",
        field: "sandbox_mode",
        weight: 4,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "codex",
    version: "1.1",
    semver: { major: 1, minor: 1, patch: 0 },
    releaseDate: "2025-12-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["codex-agent-skills"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.agents/skills/[^/]+/SKILL\\.md$",
        weight: 10,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "codex",
    version: "1.2",
    semver: { major: 1, minor: 2, patch: 0 },
    releaseDate: "2026-01-01",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: ["codex-agents-guidance", "codex-team-config"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: ["codex-custom-prompts-deprecated"],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "(^|/)AGENTS(?:\\.override)?\\.md$",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
];

// ============================================================================
// Codex CLI Vendor Surface (informational — kept for vendor-feature lookups)
// ============================================================================
//
// NOTE: this block previously declared a parallel set of 0.x "vendor" Codex
// versions. Those were dropped during the April 11 audit (see
// docs/research/repo-audit-2026-04-11.md): keeping two version sets confused
// the catalog. The detailed feature flags below are retained because they
// document vendor-surface knowledge used by the parser, renderer, and audit
// engine. They are NOT enumerated as separate VersionCatalogEntry rows — the
// CODEX_VERSIONS array above (1.0/1.1/1.2 epochs) is the single source of
// truth for version-aware decisions.

const _CODEX_VENDOR_FEATURE_REFERENCE: FeatureFlag[] = [
  {
    id: "codex-approval-policy",
    name: "Approval Policy",
    description:
      "approval_policy config (untrusted/on-request/never/granular)",
    introducedIn: "0.1",
  },
  {
    id: "codex-sandbox-mode",
    name: "Sandbox Mode",
    description:
      "sandbox_mode config (read-only/workspace-write/danger-full-access)",
    introducedIn: "0.1",
  },
  {
    id: "codex-agents-md",
    name: "AGENTS.md",
    description: "AGENTS.md + AGENTS.override.md guidance chain",
    introducedIn: "0.1",
  },
  {
    id: "codex-skills",
    name: "Agent Skills",
    description: "Agent Skills in .agents/skills/<name>/SKILL.md",
    introducedIn: "0.1",
  },
  {
    id: "codex-subagents",
    name: "Subagents",
    description: "Built-in (default/worker/explorer) + custom TOML agents",
    introducedIn: "0.1",
  },
  {
    id: "codex-mcp",
    name: "MCP Integration",
    description: "Native MCP server integration",
    introducedIn: "0.1",
  },
  {
    id: "codex-plugins",
    name: "Plugin Marketplace",
    description: "First-class plugin marketplace",
    introducedIn: "0.2",
  },
  {
    id: "codex-path-addressing",
    name: "Path-Based Addressing",
    description: "Path-based subagent addressing (/root/agent_a)",
    introducedIn: "0.2",
  },
];

// ============================================================================
// Gemini CLI Versions
// ============================================================================

export const GEMINI_FEATURES: FeatureFlag[] = [
  {
    id: "gemini-context",
    name: "Context Files",
    description: "Hierarchical GEMINI.md context files",
    introducedIn: "0.1",
  },
  {
    id: "gemini-skills",
    name: "Agent Skills",
    description: "Agent Skills in .gemini/skills/ and .agents/skills/",
    introducedIn: "0.1",
  },
  {
    id: "gemini-subagents",
    name: "Custom Subagents",
    description:
      "Custom subagents in .gemini/agents/*.md with YAML frontmatter",
    introducedIn: "0.1",
  },
  {
    id: "gemini-builtin-agents",
    name: "Built-in Agents",
    description:
      "Built-in codebase_investigator/cli_help/generalist/browser agents",
    introducedIn: "0.1",
  },
  {
    id: "gemini-tool-isolation",
    name: "Tool Isolation",
    description: "Explicit tool lists and wildcard support per agent",
    introducedIn: "0.1",
  },
  {
    id: "gemini-mcp",
    name: "MCP Support",
    description: "MCP server support with per-agent isolation",
    introducedIn: "0.1",
  },
  {
    id: "gemini-worktrees",
    name: "Worktrees",
    description: "Native git worktree support for parallel sessions",
    introducedIn: "0.2",
  },
  {
    id: "gemini-sandboxing",
    name: "Sandboxing",
    description: "macOS Seatbelt + Windows native sandboxing",
    introducedIn: "0.2",
  },
  {
    id: "gemini-policy-engine",
    name: "Policy Engine",
    description: "policy.toml with subagent-scoped rules",
    introducedIn: "0.2",
  },
  {
    id: "gemini-jit-context",
    name: "JIT Context",
    description: "JIT context injection capped at git root",
    introducedIn: "0.2",
  },
];

export const GEMINI_BREAKING_CHANGES: BreakingChange[] = [];

export const GEMINI_VERSIONS: VersionCatalogEntry[] = [
  {
    agent: "gemini",
    version: "0.1",
    semver: { major: 0, minor: 1, patch: 0 },
    releaseDate: "2025-06-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "gemini-context",
      "gemini-skills",
      "gemini-subagents",
      "gemini-builtin-agents",
      "gemini-tool-isolation",
      "gemini-mcp",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.gemini/agents/.*\\.md$",
        weight: 8,
        indicatesVersionOrLater: true,
      },
      {
        type: "file_pattern",
        pattern: "GEMINI\\.md$",
        weight: 6,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "gemini",
    version: "0.2",
    semver: { major: 0, minor: 2, patch: 0 },
    releaseDate: "2026-04-01",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [
      "gemini-worktrees",
      "gemini-sandboxing",
      "gemini-policy-engine",
      "gemini-jit-context",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
];

// ============================================================================
// OpenCode Versions
// ============================================================================

export const OPENCODE_FEATURES: FeatureFlag[] = [
  {
    id: "opencode-skills",
    name: "Skills",
    description:
      "Skills in .opencode/skills/, .claude/skills/, .agents/skills/",
    introducedIn: "1.0",
  },
  {
    id: "opencode-agents-md",
    name: "AGENTS.md",
    description: "AGENTS.md as primary rules, CLAUDE.md fallback",
    introducedIn: "1.0",
  },
  {
    id: "opencode-claude-compat",
    name: "Claude Code Compatibility",
    description:
      "Claude Code compatibility (.claude/ paths, env vars to disable)",
    introducedIn: "1.0",
  },
  {
    id: "opencode-external-instructions",
    name: "External Instructions",
    description: "opencode.json with glob/URL instruction sources",
    introducedIn: "1.0",
  },
  {
    id: "opencode-subagents",
    name: "Subagents",
    description: "Subagent support",
    introducedIn: "1.2",
  },
  {
    id: "opencode-plugins",
    name: "TUI Plugins",
    description: "TUI plugin system",
    introducedIn: "1.3",
  },
  {
    id: "opencode-gitlab",
    name: "GitLab Integration",
    description: "GitLab Agent Platform integration",
    introducedIn: "1.3",
  },
  {
    id: "opencode-session-review",
    name: "Session Review",
    description: "Git-backed session review",
    introducedIn: "1.3",
  },
];

export const OPENCODE_BREAKING_CHANGES: BreakingChange[] = [];

export const OPENCODE_VERSIONS: VersionCatalogEntry[] = [
  {
    agent: "opencode",
    version: "1.0",
    semver: { major: 1, minor: 0, patch: 0 },
    releaseDate: "2025-08-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "opencode-skills",
      "opencode-agents-md",
      "opencode-claude-compat",
      "opencode-external-instructions",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.opencode/skills/.*SKILL\\.md$",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "opencode",
    version: "1.2",
    semver: { major: 1, minor: 2, patch: 0 },
    releaseDate: "2025-12-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["opencode-subagents"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "opencode",
    version: "1.3",
    semver: { major: 1, minor: 3, patch: 0 },
    releaseDate: "2026-03-22",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [
      "opencode-plugins",
      "opencode-gitlab",
      "opencode-session-review",
    ],
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
  ...CODEX_VERSIONS,
  ...GEMINI_VERSIONS,
  ...OPENCODE_VERSIONS,
];

const ALL_FEATURES: Record<AgentId, FeatureFlag[]> = {
  claude: CLAUDE_FEATURES,
  windsurf: WINDSURF_FEATURES,
  cursor: CURSOR_FEATURES,
  gemini: GEMINI_FEATURES,
  codex: CODEX_FEATURES,
  universal: [],
  opencode: OPENCODE_FEATURES,
  aider: [],
  continue: [],
};

const ALL_BREAKING_CHANGES: Record<AgentId, BreakingChange[]> = {
  claude: CLAUDE_BREAKING_CHANGES,
  windsurf: WINDSURF_BREAKING_CHANGES,
  cursor: CURSOR_BREAKING_CHANGES,
  gemini: GEMINI_BREAKING_CHANGES,
  codex: CODEX_BREAKING_CHANGES,
  universal: [],
  opencode: OPENCODE_BREAKING_CHANGES,
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
