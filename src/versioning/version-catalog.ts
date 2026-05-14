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
    description:
      "Effort levels (low|medium|high|max). settings: effortLevel; skill frontmatter: effort; env: CLAUDE_CODE_EFFORT_LEVEL",
    introducedIn: "2.1",
  },
  {
    id: "claude-paths-trigger",
    name: "Path-Triggered Skills",
    description:
      "paths: frontmatter array — glob-matched skill auto-activation",
    introducedIn: "2.1",
  },
  {
    id: "claude-auto-memory",
    name: "Auto Memory",
    description:
      "Project-scoped persistent memory at ~/.claude/projects/<project>/memory/MEMORY.md",
    introducedIn: "2.1",
  },
  {
    id: "claude-xhigh-effort",
    name: "xhigh Effort Level",
    description:
      "Additional xhigh effort level for Opus 4.7 — requires Claude Code ≥ 2.1.111",
    introducedIn: "2.1.111",
  },
  {
    id: "claude-agents-view",
    name: "Background Agents View",
    description:
      "`claude agents` subsystem — background-agent UI surface and lifecycle commands",
    introducedIn: "2.1.139",
  },
  {
    id: "claude-worktree-integration",
    name: "Worktree Integration",
    description:
      "`claude --worktree` flag plus WorktreeCreate hook event for first-class worktree workflows",
    introducedIn: "2.1.139",
  },
];

// NOTE (audit 2026-05-14): the previously-listed `claude-rules-location`
// breaking change was fabricated. `.claude/rules/*.md` is additive
// path-scoping (see docs/en/memory#organize-rules-with-claude-rules);
// CLAUDE.md remains the canonical mechanism. No breaking move occurred.
export const CLAUDE_BREAKING_CHANGES: BreakingChange[] = [
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
    breakingChanges: [],
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
    isCurrent: false,
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
      "claude-paths-trigger",
      "claude-auto-memory",
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
  {
    agent: "claude",
    version: "2.1.111",
    semver: { major: 2, minor: 1, patch: 111 },
    vendorVersion: "2.1.111",
    releaseDate: "2026-04-16",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["claude-xhigh-effort"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "claude",
    version: "2.1.139",
    semver: { major: 2, minor: 1, patch: 139 },
    vendorVersion: "2.1.139",
    releaseDate: "2026-05-11",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["claude-agents-view", "claude-worktree-integration"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "claude",
    version: "2.1.141",
    semver: { major: 2, minor: 1, patch: 141 },
    vendorVersion: "2.1.141",
    releaseDate: "2026-05-13",
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
// Windsurf Versions
// ============================================================================

export const WINDSURF_FEATURES: FeatureFlag[] = [
  {
    id: "windsurf-workflows",
    name: "Workflows",
    description:
      "Workflow definitions in .windsurf/workflows/ + global ~/.codeium/windsurf/global_workflows/*.md + enterprise system paths",
    introducedIn: "wave-1",
  },
  {
    id: "windsurf-rules",
    name: "Rules",
    description:
      "Rule definitions in .windsurf/rules/ (.md, fed via Cascade Rules engine)",
    introducedIn: "wave-1",
  },
  {
    id: "windsurf-auto-execution",
    name: "Auto Execution Mode",
    description: "auto_execution_mode field for activation control",
    introducedIn: "wave-8",
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
    id: "windsurf-agent-skills",
    name: "Agent Skills",
    description:
      "Agent Skills at .windsurf/skills/<name>/SKILL.md + global ~/.codeium/windsurf/skills/ + enterprise system paths",
    introducedIn: "wave-13",
  },
  {
    id: "windsurf-parallel-sessions",
    name: "Parallel Sessions",
    description:
      "Multi-agent parallel sessions with Git worktrees + Multi-Cascade Panes/Tabs",
    introducedIn: "wave-13",
  },
  {
    id: "windsurf-worktree-hook",
    name: "Worktree Hook",
    description:
      "post_setup_worktree hook (added 2026-01-14 in 1.13.8 patch within Wave 13)",
    introducedIn: "wave-13",
  },
  {
    id: "windsurf-mdm",
    name: "System Rules & Workflows via MDM",
    description:
      "Enterprise system-level rules and workflows distributed via MDM",
    introducedIn: "wave-13",
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
    id: "windsurf-claude-compat",
    name: "Claude Code Compatibility",
    description:
      "readClaudeCodeConfig flag for .claude/skills/ and ~/.claude/skills/ discovery",
    introducedIn: "wave-14",
  },
  {
    id: "windsurf-agents-skills",
    name: "Agents Skills Directory",
    description:
      ".agents/skills/ and ~/.agents/skills/ discovery (Cascade scans both)",
    introducedIn: "1.9552.21",
  },
  {
    id: "windsurf-cascade-transcript-hook",
    name: "Cascade Transcript Hook",
    description:
      "post_cascade_response_with_transcript hook event (added 1.9566.9)",
    introducedIn: "1.9566.9",
  },
  {
    id: "windsurf-agents-md",
    name: "AGENTS.md Auto-Discovery",
    description:
      "Windsurf auto-discovers AGENTS.md / agents.md workspace-wide and feeds them into the Cascade Rules engine",
    introducedIn: "wave-13",
  },
  {
    id: "windsurf-hooks",
    name: "Cascade Hooks (12 events)",
    description:
      "Hook events: pre/post_read_code, pre/post_write_code, pre/post_run_command, pre/post_mcp_tool_use, pre_user_prompt, post_cascade_response, post_cascade_response_with_transcript, post_setup_worktree",
    introducedIn: "wave-13",
  },
  {
    id: "windsurf-devin",
    name: "Devin in Windsurf",
    description: "Devin agent integration in Windsurf + Agent Command Center",
    introducedIn: "2.0",
  },
  {
    id: "windsurf-devin-terminal",
    name: "Devin for Terminal",
    description: "Devin for Terminal mode",
    introducedIn: "2.1",
  },
  {
    id: "windsurf-devin-review",
    name: "Devin Review",
    description: "Devin Review for all (general availability)",
    introducedIn: "2.2",
  },
];

// NOTE (audit 2026-05-14): `windsurf-skills-location` (wave-9/wave-10) was
// fabricated. Agent Skills did not exist before Wave 13 (2025-12-24); there
// was no prior .windsurf/skills/ to migrate from. Removed.
export const WINDSURF_BREAKING_CHANGES: BreakingChange[] = [];

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
    version: "wave-11",
    releaseDate: "2025-08-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-browser-preview"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "wave-12",
    releaseDate: "2025-10-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-voice-input"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "wave-13",
    releaseDate: "2025-12-24",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "windsurf-agent-skills",
      "windsurf-parallel-sessions",
      "windsurf-worktree-hook",
      "windsurf-mdm",
      "windsurf-agents-md",
      "windsurf-hooks",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.windsurf/skills/[^/]+/SKILL\\.md$",
        weight: 10,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "windsurf",
    version: "wave-14",
    releaseDate: "2026-01-30",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "windsurf-arena-mode",
      "windsurf-plan-mode",
      "windsurf-claude-compat",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "1.9552.21",
    semver: { major: 1, minor: 9552, patch: 21 },
    vendorVersion: "1.9552.21",
    releaseDate: "2026-02-12",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-agents-skills"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.agents/skills/[^/]+/SKILL\\.md$",
        weight: 6,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "windsurf",
    version: "1.9566.9",
    semver: { major: 1, minor: 9566, patch: 9 },
    vendorVersion: "1.9566.9",
    releaseDate: "2026-02-25",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-cascade-transcript-hook"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "2.0",
    semver: { major: 2, minor: 0, patch: 0 },
    vendorVersion: "2.0",
    releaseDate: "2026-04-15",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-devin"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "2.1",
    semver: { major: 2, minor: 1, patch: 0 },
    vendorVersion: "2.1",
    releaseDate: "2026-04-28",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["windsurf-devin-terminal"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "windsurf",
    version: "2.2",
    semver: { major: 2, minor: 2, patch: 17 },
    vendorVersion: "2.2.17",
    releaseDate: "2026-05-06",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: ["windsurf-devin-review"],
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
    id: "cursor-subagents",
    name: "Subagents",
    description: "Independent specialised subagents (async in 2.5+)",
    introducedIn: "2.4",
  },
  {
    id: "cursor-image-generation",
    name: "Image Generation",
    description: "In-Editor image generation",
    introducedIn: "2.4",
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
    id: "cursor-sandbox-controls",
    name: "Sandbox Controls",
    description: ".cursor/sandbox.json network and permission controls",
    introducedIn: "2.5",
  },
  {
    id: "cursor-self-hosted-agents",
    name: "Self-Hosted Agents",
    description: "Self-hosted cloud agents on own infrastructure",
    introducedIn: "2.5.1",
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
  {
    id: "cursor-pr-review-tabs",
    name: "PR Review Tabs",
    description: "Dedicated PR review surface integrated with Agents Window",
    introducedIn: "3.1",
  },
  {
    id: "cursor-build-in-parallel",
    name: "Build in Parallel",
    description: "Coordinate multiple agents building related work in parallel",
    introducedIn: "3.2",
  },
  {
    id: "cursor-multitask",
    name: "Multitask",
    description: "/multitask command to spawn multiple subagents at once",
    introducedIn: "3.3",
  },
  {
    id: "cursor-async-subagent-pinning",
    name: "Async Subagent Pinning",
    description: "Pin async subagents to specific tasks across sessions",
    introducedIn: "3.3",
  },
  {
    id: "cursor-split-changes-prs",
    name: "Split Changes into PRs",
    description: "Auto-split a long-running change into multiple PRs",
    introducedIn: "3.3",
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
  // NOTE (audit 2026-05-14): `cursor-cloud-agents-removed` was fabricated.
  // Cursor 3.0 introduced Agents Window + /worktree + /best-of-n; cloud
  // agents were not removed (https://cursor.com/changelog/3-0). The earlier
  // March 2026 self-hosted agents release added a deployment option; it did
  // not remove anything.
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
    featuresIntroduced: [
      "cursor-skills",
      "cursor-subagents",
      "cursor-image-generation",
    ],
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
    releaseDate: "2026-02-17",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "cursor-automations",
      "cursor-marketplace-plugins",
      "cursor-sandbox-controls",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "2.5.1",
    semver: { major: 2, minor: 5, patch: 1 },
    releaseDate: "2026-03-25",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-self-hosted-agents"],
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
    isCurrent: false,
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
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "field_present",
        field: "worktree",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "cursor",
    version: "3.1",
    semver: { major: 3, minor: 1, patch: 0 },
    releaseDate: "2026-04-15",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-pr-review-tabs"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "3.2",
    semver: { major: 3, minor: 2, patch: 0 },
    releaseDate: "2026-04-28",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["cursor-build-in-parallel"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "cursor",
    version: "3.3",
    semver: { major: 3, minor: 3, patch: 0 },
    releaseDate: "2026-05-07",
    isCurrent: true,
    isSupported: true,
    vendorVersion: "3.3",
    featuresIntroduced: [
      "cursor-multitask",
      "cursor-async-subagent-pinning",
      "cursor-split-changes-prs",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
];

// ============================================================================
// Codex Compatibility Epochs
// ============================================================================
//
// IMPORTANT: these are CACE internal compatibility epochs, not official Codex
// CLI vendor semver releases. Codex's public release train is still 0.x
// (latest 0.130.0 as of 2026-05-08). CACE uses a smaller set of milestones
// (1.0/1.1/1.2) for migration and adaptation logic; each epoch row carries a
// `vendorVersion` field pinning the canonical Codex CLI minor it tracks.
// See docs/research/repo-audit-2026-05-14.md for the latest audit.

export const CODEX_FEATURES: FeatureFlag[] = [
  {
    id: "codex-ga",
    name: "Codex GA Epoch",
    description:
      "CACE epoch representing the point where Codex became a stable compatibility surface (approval_policy, sandbox_mode, MCP, .codex/config.toml), while vendor releases remained 0.x",
    introducedIn: "1.0",
  },
  {
    id: "codex-approval-policy",
    name: "Approval Policy",
    description:
      "approval_policy config — untrusted | on-request | never | granular",
    introducedIn: "1.0",
  },
  {
    id: "codex-sandbox-mode",
    name: "Sandbox Mode",
    description:
      "sandbox_mode config — read-only | workspace-write | danger-full-access",
    introducedIn: "1.0",
  },
  {
    id: "codex-mcp",
    name: "MCP Integration",
    description: "Native MCP server integration",
    introducedIn: "1.0",
  },
  {
    id: "codex-subagents",
    name: "Subagents",
    description:
      "Built-in subagents (default/worker/explorer) plus custom TOML subagents at .codex/agents/*.toml and ~/.codex/agents/*.toml",
    introducedIn: "1.0",
  },
  {
    id: "codex-agent-skills",
    name: "Agent Skills",
    description:
      "Native skill definitions in .agents/skills/<name>/SKILL.md (project) and ~/.agents/skills/ (user)",
    introducedIn: "1.1",
  },
  {
    id: "codex-agents-guidance",
    name: "AGENTS.md Guidance Chain",
    description:
      "Hierarchical project guidance via AGENTS.md and AGENTS.override.md (with project_doc_fallback_filenames + project_doc_max_bytes 32 KiB)",
    introducedIn: "1.2",
  },
  {
    id: "codex-team-config",
    name: "Team Config",
    description:
      "Shared configuration via Codex home (~/.codex) and team-level settings",
    introducedIn: "1.2",
  },
  {
    id: "codex-requirements",
    name: "Admin Requirements (requirements.toml)",
    description:
      "Admin-enforced governance layer (allowlists for approval/sandbox/feature flags) — different from config.toml",
    introducedIn: "1.2",
  },
  {
    id: "codex-doc-fallback",
    name: "Project Doc Fallback",
    description:
      "project_doc_fallback_filenames config — allows TEAM_GUIDE.md and other names to act as the AGENTS.md context file",
    introducedIn: "1.2",
  },
  {
    id: "codex-plugins",
    name: "Plugin Marketplace",
    description:
      "First-class plugin marketplace (vendor 0.128.0+); plugin sharing in 0.130",
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
    vendorVersion: "0.50",
    releaseDate: "2025-10-01",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: [
      "codex-ga",
      "codex-approval-policy",
      "codex-sandbox-mode",
      "codex-mcp",
      "codex-subagents",
    ],
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
      {
        type: "file_pattern",
        pattern: "\\.codex/agents/.*\\.toml$",
        weight: 6,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "codex",
    version: "1.1",
    semver: { major: 1, minor: 1, patch: 0 },
    vendorVersion: "0.100",
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
    vendorVersion: "0.130.0",
    releaseDate: "2026-01-01",
    isCurrent: true,
    isSupported: true,
    featuresIntroduced: [
      "codex-agents-guidance",
      "codex-team-config",
      "codex-requirements",
      "codex-doc-fallback",
      "codex-plugins",
    ],
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
      {
        type: "file_pattern",
        pattern: "(^|/)requirements\\.toml$",
        weight: 6,
        indicatesVersionOrLater: true,
      },
    ],
  },
];

// ============================================================================
// Gemini CLI Versions
// ============================================================================

export const GEMINI_FEATURES: FeatureFlag[] = [
  {
    id: "gemini-context",
    name: "Context Files",
    description:
      "Hierarchical GEMINI.md context files (workspace + ~/.gemini/GEMINI.md global)",
    introducedIn: "0.1",
  },
  {
    id: "gemini-context-filename-alias",
    name: "Context Filename Alias",
    description:
      "context.fileName in ~/.gemini/settings.json — accepts AGENTS.md and CONTEXT.md as instruction file aliases alongside GEMINI.md",
    introducedIn: "0.1",
  },
  {
    id: "gemini-skills",
    name: "Agent Skills",
    description:
      "Agent Skills in .gemini/skills/<name>/SKILL.md and .agents/skills/<name>/SKILL.md alias",
    introducedIn: "0.1",
  },
  {
    id: "gemini-subagents",
    name: "Custom Subagents",
    description:
      "Custom subagents in .gemini/agents/*.md with YAML frontmatter (name, description, kind, tools, model, temperature, max_turns)",
    introducedIn: "0.1",
  },
  {
    id: "gemini-builtin-agents",
    name: "Built-in Agents",
    description:
      "Built-in codebase_investigator / cli_help / generalist / browser_agent",
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
    id: "gemini-settings",
    name: "Settings",
    description:
      "~/.gemini/settings.json — security, experimental, context, mcpServers blocks",
    introducedIn: "0.1",
  },
  {
    id: "gemini-trusted-folders",
    name: "Trusted Folders",
    description:
      "security.folderTrust + ~/.gemini/trustedFolders.json; untrusted folders skip .gemini/settings.json loading",
    introducedIn: "0.1",
  },
  {
    id: "gemini-custom-commands",
    name: "Custom Commands",
    description:
      "Custom slash commands in .gemini/commands/*.toml (separate from skills)",
    introducedIn: "0.1",
  },
  {
    id: "gemini-worktrees",
    name: "Worktrees (Experimental)",
    description:
      "Experimental git worktree support via experimental.worktrees: true and gemini --worktree/-w",
    introducedIn: "0.2",
  },
  {
    id: "gemini-sandboxing",
    name: "Sandboxing",
    description:
      "macOS Seatbelt (sandbox-exec), Windows icacls Low Mandatory Level, Linux gVisor/Docker/Podman/LXC",
    introducedIn: "0.2",
  },
  {
    id: "gemini-policy-engine",
    name: "Policy Engine",
    description:
      "~/.gemini/policies/*.toml directory of policy files with subagent-scoped rules",
    introducedIn: "0.2",
  },
  {
    id: "gemini-jit-context",
    name: "JIT Context",
    description:
      "JIT GEMINI.md context discovery up to the trusted-folder root (ancestor chain)",
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
      "gemini-context-filename-alias",
      "gemini-skills",
      "gemini-subagents",
      "gemini-builtin-agents",
      "gemini-tool-isolation",
      "gemini-mcp",
      "gemini-settings",
      "gemini-trusted-folders",
      "gemini-custom-commands",
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
      {
        type: "file_pattern",
        pattern: "\\.gemini/settings\\.json$",
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
    isCurrent: false,
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
    detectionMarkers: [
      {
        type: "file_pattern",
        pattern: "\\.gemini/policies/.*\\.toml$",
        weight: 7,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "gemini",
    version: "0.42",
    semver: { major: 0, minor: 42, patch: 0 },
    vendorVersion: "0.42.0",
    releaseDate: "2026-05-12",
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
// OpenCode Versions
// ============================================================================

export const OPENCODE_FEATURES: FeatureFlag[] = [
  {
    id: "opencode-skills",
    name: "Skills",
    description:
      "Skills in .opencode/skills/, .claude/skills/, .agents/skills/ (plus user-level equivalents under ~/.config/opencode, ~/.claude, ~/.agents). Vendor docs do not specify a precedence ordering across the three roots.",
    introducedIn: "1.0",
  },
  {
    id: "opencode-agents-md",
    name: "AGENTS.md",
    description:
      "AGENTS.md as primary rules (precedence over CLAUDE.md when both present)",
    introducedIn: "1.0",
  },
  {
    id: "opencode-claude-compat",
    name: "Claude Code Compatibility",
    description:
      "Claude Code compatibility — reads ~/.claude/CLAUDE.md (toggleable) and .claude/skills/",
    introducedIn: "1.0",
  },
  {
    id: "opencode-external-instructions",
    name: "External Instructions",
    description:
      "opencode.json instructions field — accepts file paths and glob patterns (URL sources not documented as supported)",
    introducedIn: "1.0",
  },
  {
    id: "opencode-subagents",
    name: "Subagents",
    description:
      "Subagents at .opencode/agents/<name>.md (project) and ~/.config/opencode/agents/<name>.md (user). Frontmatter requires mode: subagent.",
    introducedIn: "1.2",
  },
  {
    id: "opencode-permission-tristate",
    name: "Permission Tri-State",
    description:
      "Subagent permission frontmatter — allow | deny | ask per tool key (read, edit, bash, webfetch, glob, grep), glob patterns supported (e.g. \"git *\": \"ask\")",
    introducedIn: "1.2",
  },
  {
    id: "opencode-mcp",
    name: "MCP Servers",
    description: "MCP servers as first-class config in opencode.json",
    introducedIn: "1.0",
  },
  {
    id: "opencode-plugins",
    name: "Plugins",
    description:
      "Plugin system — JS/TS modules with event hooks (session compaction, tui.prompt.append, tui.command.execute, tui.toast.show), custom tools",
    introducedIn: "1.3",
  },
  {
    id: "opencode-gitlab",
    name: "GitLab Integration",
    description:
      "GitLab Duo integration — @opencode mentions, issue triage, MR creation, code review",
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
      "opencode-mcp",
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
    featuresIntroduced: [
      "opencode-subagents",
      "opencode-permission-tristate",
    ],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [
      {
        type: "field_present",
        field: "mode",
        value: "subagent",
        weight: 8,
        indicatesVersionOrLater: true,
      },
    ],
  },
  {
    agent: "opencode",
    version: "1.3",
    semver: { major: 1, minor: 3, patch: 0 },
    releaseDate: "2026-03-22",
    isCurrent: false,
    isSupported: true,
    featuresIntroduced: ["opencode-plugins", "opencode-gitlab"],
    featuresDeprecated: [],
    featuresRemoved: [],
    breakingChanges: [],
    detectionMarkers: [],
  },
  {
    agent: "opencode",
    version: "1.14",
    semver: { major: 1, minor: 14, patch: 50 },
    vendorVersion: "1.14.50",
    releaseDate: "2026-05-14",
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
