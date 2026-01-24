/**
 * Migration guide generation for version transitions
 */

import type { AgentId } from "../core/types.js";
import type {
  MigrationGuide,
  MigrationGuideStep,
  BreakingChange,
} from "./types.js";
import {
  getBreakingChangesBetween,
  getAgentVersions,
  getVersion,
} from "./version-catalog.js";

// ============================================================================
// Guide Generation
// ============================================================================

/**
 * Generate a migration guide between two versions
 */
export function generateMigrationGuide(
  agent: AgentId,
  fromVersion: string,
  toVersion: string,
): MigrationGuide | null {
  const fromVersionEntry = getVersion(agent, fromVersion);
  const toVersionEntry = getVersion(agent, toVersion);

  if (!fromVersionEntry || !toVersionEntry) {
    return null;
  }

  const breakingChanges = getBreakingChangesBetween(
    agent,
    fromVersion,
    toVersion,
  );

  if (breakingChanges.length === 0) {
    return {
      agent,
      fromVersion,
      toVersion,
      title: `Migration Guide: ${fromVersion} to ${toVersion}`,
      overview: `No breaking changes between ${fromVersion} and ${toVersion}. Direct upgrade is safe.`,
      steps: [],
      notes: ["This is a non-breaking upgrade. No manual changes required."],
    };
  }

  const steps: MigrationGuideStep[] = breakingChanges.map((change, index) => ({
    step: index + 1,
    title: getStepTitle(change),
    description: getStepDescription(change),
    before: getBeforeExample(change),
    after: getAfterExample(change),
    isBreaking: true,
  }));

  return {
    agent,
    fromVersion,
    toVersion,
    title: `Migration Guide: ${fromVersion} to ${toVersion}`,
    overview: `This guide covers ${breakingChanges.length} breaking change(s) when upgrading from ${fromVersion} to ${toVersion}.`,
    steps,
    notes: generateNotes(agent, breakingChanges),
    links: generateLinks(agent),
  };
}

// ============================================================================
// Step Generation Helpers
// ============================================================================

function getStepTitle(change: BreakingChange): string {
  switch (change.type) {
    case "field_renamed":
      return `Rename field: ${change.affected}`;
    case "field_removed":
      return `Remove field: ${change.affected}`;
    case "field_added_required":
      return `Add required field: ${change.affected}`;
    case "format_changed":
      return `Update format: ${change.affected}`;
    case "location_changed":
      return `Move files: ${change.affected}`;
    case "behavior_changed":
      return `Update behavior: ${change.affected}`;
    case "syntax_changed":
      return `Update syntax: ${change.affected}`;
    default:
      return `Update: ${change.affected}`;
  }
}

function getStepDescription(change: BreakingChange): string {
  return `${change.description}\n\n**Migration:** ${change.migration}${
    change.autoMigratable
      ? "\n\n*This change can be automatically migrated.*"
      : "\n\n*This change requires manual migration.*"
  }`;
}

function getBeforeExample(change: BreakingChange): string | undefined {
  // Generate before examples based on change type
  switch (change.id) {
    case "cursor-rules-migration":
      return `# File: .cursorrules

You are a helpful assistant...`;

    case "cursor-mdc-format":
      return `# File: .cursor/rules/my-rule.md

Rule content without frontmatter...`;

    case "claude-rules-location":
      return `# File: CLAUDE.md

## Rules

- Always use TypeScript
- Follow clean code principles`;

    case "claude-hooks-format":
      return `# File: CLAUDE.md (inline hooks)

<!-- hooks defined inline -->`;

    case "windsurf-skills-location":
      return `# File: .windsurf/workflows/my-skill.md

---
description: My skill
---

Skill content...`;

    default:
      return undefined;
  }
}

function getAfterExample(change: BreakingChange): string | undefined {
  // Generate after examples based on change type
  switch (change.id) {
    case "cursor-rules-migration":
      return `# File: .cursor/rules/default.mdc

---
description: Migrated from .cursorrules
globs:
  - "**/*"
---

You are a helpful assistant...`;

    case "cursor-mdc-format":
      return `# File: .cursor/rules/my-rule.mdc

---
description: My rule
globs:
  - "**/*.ts"
---

Rule content with frontmatter...`;

    case "claude-rules-location":
      return `# File: .claude/rules/typescript.md

Always use TypeScript

# File: .claude/rules/clean-code.md

Follow clean code principles`;

    case "claude-hooks-format":
      return `# File: .claude/settings.json

{
  "hooks": [
    {
      "event": "PostToolUse",
      "command": "./format.sh"
    }
  ]
}`;

    case "windsurf-skills-location":
      return `# File: .windsurf/skills/my-skill/SKILL.md

---
description: My skill
---

Skill content...`;

    default:
      return undefined;
  }
}

function generateNotes(
  agent: AgentId,
  breakingChanges: BreakingChange[],
): string[] {
  const notes: string[] = [];

  const autoMigratable = breakingChanges.filter((c) => c.autoMigratable).length;
  const manual = breakingChanges.length - autoMigratable;

  if (autoMigratable > 0) {
    notes.push(
      `${autoMigratable} change(s) can be automatically migrated using \`cace migrate\`.`,
    );
  }
  if (manual > 0) {
    notes.push(`${manual} change(s) require manual intervention.`);
  }

  // Agent-specific notes
  if (agent === "cursor") {
    notes.push(
      "Cursor version upgrades may require IDE restart for full effect.",
    );
    notes.push(
      "Check .cursorrules is removed after migration to avoid conflicts.",
    );
  }
  if (agent === "claude") {
    notes.push("Claude Code will auto-detect version from file structure.");
    notes.push("Test skills in isolation after migration.");
  }
  if (agent === "windsurf") {
    notes.push("Windsurf may require reload to pick up new skill locations.");
  }

  return notes;
}

function generateLinks(agent: AgentId): string[] {
  const links: string[] = [];

  switch (agent) {
    case "claude":
      links.push(
        "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
      );
      links.push("https://docs.anthropic.com/claude-code");
      break;
    case "cursor":
      links.push("https://cursor.com/changelog");
      links.push("https://docs.cursor.com");
      break;
    case "windsurf":
      links.push("https://windsurf.com/changelog");
      links.push("https://docs.windsurf.com");
      break;
  }

  return links;
}

// ============================================================================
// Guide Formatting
// ============================================================================

/**
 * Format a migration guide as Markdown
 */
export function formatMigrationGuideAsMarkdown(guide: MigrationGuide): string {
  const lines: string[] = [];

  lines.push(`# ${guide.title}`);
  lines.push("");
  lines.push(`**Agent:** ${guide.agent}`);
  lines.push(`**From:** ${guide.fromVersion}`);
  lines.push(`**To:** ${guide.toVersion}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(guide.overview);
  lines.push("");

  if (guide.steps.length > 0) {
    lines.push("## Migration Steps");
    lines.push("");

    for (const step of guide.steps) {
      lines.push(`### Step ${step.step}: ${step.title}`);
      lines.push("");
      lines.push(step.description);
      lines.push("");

      if (step.before) {
        lines.push("**Before:**");
        lines.push("");
        lines.push("```");
        lines.push(step.before);
        lines.push("```");
        lines.push("");
      }

      if (step.after) {
        lines.push("**After:**");
        lines.push("");
        lines.push("```");
        lines.push(step.after);
        lines.push("```");
        lines.push("");
      }
    }
  }

  if (guide.notes && guide.notes.length > 0) {
    lines.push("## Notes");
    lines.push("");
    for (const note of guide.notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  if (guide.links && guide.links.length > 0) {
    lines.push("## Related Links");
    lines.push("");
    for (const link of guide.links) {
      lines.push(`- ${link}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Format a migration guide for CLI output
 */
export function formatMigrationGuideForCli(guide: MigrationGuide): string {
  const lines: string[] = [];

  lines.push(`\n${guide.title}`);
  lines.push("=".repeat(guide.title.length));
  lines.push("");
  lines.push(`Agent: ${guide.agent}`);
  lines.push(`From:  ${guide.fromVersion}`);
  lines.push(`To:    ${guide.toVersion}`);
  lines.push("");
  lines.push(guide.overview);
  lines.push("");

  if (guide.steps.length > 0) {
    lines.push("Migration Steps:");
    lines.push("");

    for (const step of guide.steps) {
      const icon = step.isBreaking ? "!" : "-";
      lines.push(`  ${icon} Step ${step.step}: ${step.title}`);
      lines.push(`    ${step.description.split("\n")[0]}`);
    }
    lines.push("");
  }

  if (guide.notes && guide.notes.length > 0) {
    lines.push("Notes:");
    for (const note of guide.notes) {
      lines.push(`  - ${note}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================================
// Migration Analysis
// ============================================================================

/**
 * Analyze the migration path between two versions
 */
export function analyzeMigrationPath(
  agent: AgentId,
  fromVersion: string,
  toVersion: string,
): {
  breakingChanges: number;
  autoMigratable: number;
  manualSteps: number;
  complexity: "low" | "medium" | "high";
  estimatedEffort: string;
} {
  const breakingChanges = getBreakingChangesBetween(
    agent,
    fromVersion,
    toVersion,
  );
  const autoMigratable = breakingChanges.filter((c) => c.autoMigratable).length;
  const manualSteps = breakingChanges.length - autoMigratable;

  let complexity: "low" | "medium" | "high";
  let estimatedEffort: string;

  if (breakingChanges.length === 0) {
    complexity = "low";
    estimatedEffort = "Minimal - no breaking changes";
  } else if (manualSteps === 0) {
    complexity = "low";
    estimatedEffort = "Quick - all changes auto-migratable";
  } else if (manualSteps <= 2) {
    complexity = "medium";
    estimatedEffort = "Moderate - some manual steps required";
  } else {
    complexity = "high";
    estimatedEffort = "Significant - multiple manual changes needed";
  }

  return {
    breakingChanges: breakingChanges.length,
    autoMigratable,
    manualSteps,
    complexity,
    estimatedEffort,
  };
}

/**
 * Get all available migration paths for an agent
 */
export function getAvailableMigrationPaths(
  agent: AgentId,
): Array<{ from: string; to: string; breakingChanges: number }> {
  const versions = getAgentVersions(agent);
  const paths: Array<{ from: string; to: string; breakingChanges: number }> =
    [];

  for (let i = 0; i < versions.length - 1; i++) {
    for (let j = i + 1; j < versions.length; j++) {
      const fromVersion = versions[i];
      const toVersion = versions[j];
      if (fromVersion && toVersion) {
        const from = fromVersion.version;
        const to = toVersion.version;
        const breakingChangesCount = getBreakingChangesBetween(
          agent,
          from,
          to,
        ).length;
        paths.push({ from, to, breakingChanges: breakingChangesCount });
      }
    }
  }

  return paths;
}

/**
 * Get recommended upgrade path (step by step through versions)
 */
export function getRecommendedUpgradePath(
  agent: AgentId,
  fromVersion: string,
  toVersion: string,
): string[] {
  const versions = getAgentVersions(agent);
  const fromIndex = versions.findIndex((v) => v.version === fromVersion);
  const toIndex = versions.findIndex((v) => v.version === toVersion);

  if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
    return [];
  }

  // Return all versions in the upgrade path
  return versions.slice(fromIndex, toIndex + 1).map((v) => v.version);
}
