/**
 * Version adapters for transforming content between versions
 */

import matter from "gray-matter";
import type { AgentId } from "../core/types.js";
import type { VersionAdaptResult } from "./types.js";
import {
  getBreakingChangesBetween,
  compareVersions,
  getCurrentVersion,
} from "./version-catalog.js";

// ============================================================================
// Adapter Functions
// ============================================================================

type AdapterFunction = (
  content: string,
  frontmatter: Record<string, unknown>,
) => {
  content: string;
  frontmatter: Record<string, unknown>;
  transformation: string;
  warning?: string;
};

// ============================================================================
// Claude Code Adapters
// ============================================================================

const CLAUDE_ADAPTERS: Record<string, AdapterFunction> = {
  /**
   * Adapt v1.0 content for v1.5+ (add default model if using agent)
   */
  addModelDefault: (content, frontmatter) => {
    if (frontmatter.agent && !frontmatter.model) {
      return {
        content,
        frontmatter: { ...frontmatter, model: "sonnet" },
        transformation: 'Added default model "sonnet" for agent usage',
      };
    }
    return { content, frontmatter, transformation: "" };
  },

  /**
   * Adapt for v2.0 rules location change
   */
  warnRulesLocation: (content, frontmatter) => {
    return {
      content,
      frontmatter,
      transformation: "",
      warning: "Rules should be moved to .claude/rules/ directory in v2.0+",
    };
  },
};

// ============================================================================
// Cursor Adapters
// ============================================================================

const CURSOR_ADAPTERS: Record<string, AdapterFunction> = {
  /**
   * Migrate .cursorrules to .cursor/rules/*.mdc format
   */
  migrateCursorRules: (content, frontmatter) => {
    // Add frontmatter if not present
    if (Object.keys(frontmatter).length === 0) {
      return {
        content,
        frontmatter: {
          description: "Migrated from .cursorrules",
          globs: ["**/*"],
        },
        transformation: "Added MDC frontmatter for v1.7+ compatibility",
      };
    }
    return { content, frontmatter, transformation: "" };
  },

  /**
   * Convert to MDC format
   */
  convertToMdcFormat: (content, frontmatter) => {
    // Ensure proper MDC structure
    if (!frontmatter.globs && !frontmatter.description) {
      return {
        content,
        frontmatter: {
          ...frontmatter,
          description: frontmatter.title ?? "Rule",
        },
        transformation: "Added MDC format metadata",
      };
    }
    return { content, frontmatter, transformation: "" };
  },
};

// ============================================================================
// Windsurf Adapters
// ============================================================================

const WINDSURF_ADAPTERS: Record<string, AdapterFunction> = {
  /**
   * Migrate skill location for wave-10+
   */
  migrateWindsurfSkillLocation: (content, frontmatter) => {
    return {
      content,
      frontmatter,
      transformation: "",
      warning:
        "Skills should be moved to .windsurf/skills/<name>/SKILL.md format",
    };
  },

  /**
   * Add auto_execution_mode if not present (for wave-8+)
   */
  addAutoExecutionMode: (content, frontmatter) => {
    if (!("auto_execution_mode" in frontmatter)) {
      return {
        content,
        frontmatter: { ...frontmatter, auto_execution_mode: 0 },
        transformation:
          "Added auto_execution_mode: 0 for wave-8+ compatibility",
      };
    }
    return { content, frontmatter, transformation: "" };
  },
};

// ============================================================================
// Adapter Registry
// ============================================================================

const ADAPTERS: Record<AgentId, Record<string, AdapterFunction>> = {
  claude: CLAUDE_ADAPTERS,
  cursor: CURSOR_ADAPTERS,
  windsurf: WINDSURF_ADAPTERS,
  gemini: {},
  universal: {},
  opencode: {},
  aider: {},
  continue: {},
};

// ============================================================================
// Version Adaptation Logic
// ============================================================================

/**
 * Adapt content from one version to another
 */
export function adaptVersion(
  agent: AgentId,
  content: string,
  fromVersion: string,
  toVersion: string,
): VersionAdaptResult {
  const transformations: string[] = [];
  const warnings: string[] = [];
  let hasBreakingChanges = false;

  // Parse content
  let parsed: { data: Record<string, unknown>; content: string };
  try {
    parsed = matter(content);
  } catch {
    return {
      content,
      transformations: [],
      warnings: ["Failed to parse content frontmatter"],
      hasBreakingChanges: false,
    };
  }

  let frontmatter = parsed.data as Record<string, unknown>;
  let body = parsed.content;

  // Get breaking changes between versions
  const breakingChanges = getBreakingChangesBetween(
    agent,
    fromVersion,
    toVersion,
  );
  if (breakingChanges.length > 0) {
    hasBreakingChanges = true;
  }

  // Determine adaptation direction
  const direction = compareVersions(agent, fromVersion, toVersion);
  const agentAdapters = ADAPTERS[agent] ?? {};

  // Apply relevant adapters
  for (const change of breakingChanges) {
    if (change.autoMigratable && change.transformFn) {
      const adapter = agentAdapters[change.transformFn];
      if (adapter) {
        const result = adapter(body, frontmatter);
        if (result.transformation) {
          transformations.push(result.transformation);
        }
        if (result.warning) {
          warnings.push(result.warning);
        }
        body = result.content;
        frontmatter = result.frontmatter;
      }
    } else {
      // Non-auto-migratable changes produce warnings
      warnings.push(
        `Breaking change: ${change.description}. ${change.migration}`,
      );
    }
  }

  // Apply version-specific adaptations based on direction
  if (direction < 0) {
    // Upgrading to newer version
    applyUpgradeAdaptations(
      agent,
      fromVersion,
      toVersion,
      frontmatter,
      transformations,
    );
  } else if (direction > 0) {
    // Downgrading to older version
    applyDowngradeAdaptations(
      agent,
      fromVersion,
      toVersion,
      frontmatter,
      warnings,
    );
  }

  // Rebuild content with updated frontmatter
  const newContent = rebuildContent(frontmatter, body);

  return {
    content: newContent,
    transformations,
    warnings,
    hasBreakingChanges,
  };
}

/**
 * Apply adaptations when upgrading to a newer version
 */
function applyUpgradeAdaptations(
  agent: AgentId,
  _fromVersion: string,
  toVersion: string,
  frontmatter: Record<string, unknown>,
  transformations: string[],
): void {
  const agentAdapters = ADAPTERS[agent] ?? {};

  // Claude-specific upgrades
  if (agent === "claude") {
    // If upgrading to 1.5+ and using agent field, suggest adding model
    if (compareVersions(agent, toVersion, "1.5") >= 0) {
      if (frontmatter.agent && !frontmatter.model) {
        const result = agentAdapters["addModelDefault"]?.("", frontmatter);
        if (result?.transformation) {
          Object.assign(frontmatter, result.frontmatter);
          transformations.push(result.transformation);
        }
      }
    }
  }

  // Windsurf-specific upgrades
  if (agent === "windsurf") {
    // If upgrading to wave-8+, add auto_execution_mode
    if (compareVersions(agent, toVersion, "wave-8") >= 0) {
      const result = agentAdapters["addAutoExecutionMode"]?.("", frontmatter);
      if (result?.transformation) {
        Object.assign(frontmatter, result.frontmatter);
        transformations.push(result.transformation);
      }
    }
  }

  // Cursor-specific upgrades
  if (agent === "cursor") {
    // If upgrading to 1.7+, add MDC format metadata
    if (compareVersions(agent, toVersion, "1.7") >= 0) {
      const result = agentAdapters["convertToMdcFormat"]?.("", frontmatter);
      if (result?.transformation) {
        Object.assign(frontmatter, result.frontmatter);
        transformations.push(result.transformation);
      }
    }
  }
}

/**
 * Apply adaptations when downgrading to an older version
 */
function applyDowngradeAdaptations(
  agent: AgentId,
  _fromVersion: string,
  toVersion: string,
  frontmatter: Record<string, unknown>,
  warnings: string[],
): void {
  // Claude-specific downgrades
  if (agent === "claude") {
    // If downgrading to before 1.5, warn about agent/model fields
    if (compareVersions(agent, toVersion, "1.5") < 0) {
      if (frontmatter.agent) {
        warnings.push("Agent field is not supported in versions before 1.5");
        delete frontmatter.agent;
      }
      if (frontmatter.model) {
        warnings.push("Model field is not supported in versions before 1.5");
        delete frontmatter.model;
      }
    }
  }

  // Windsurf-specific downgrades
  if (agent === "windsurf") {
    // If downgrading to before wave-8, remove auto_execution_mode
    if (compareVersions(agent, toVersion, "wave-8") < 0) {
      if ("auto_execution_mode" in frontmatter) {
        warnings.push(
          "auto_execution_mode is not supported in versions before wave-8",
        );
        delete frontmatter.auto_execution_mode;
      }
    }
  }

  // Cursor-specific downgrades
  if (agent === "cursor") {
    // If downgrading to before 1.7, warn about MDC format
    if (compareVersions(agent, toVersion, "1.7") < 0) {
      if (frontmatter.globs) {
        warnings.push(
          "Globs frontmatter is not supported before v1.7. Use .cursorrules format.",
        );
      }
    }
  }
}

/**
 * Rebuild content with updated frontmatter
 */
function rebuildContent(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const hasFrontmatter = Object.keys(frontmatter).length > 0;

  if (!hasFrontmatter) {
    return body.trim();
  }

  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "string") {
      if (value.includes(":") || value.includes("#") || value.includes("\n")) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(body.trim());

  return lines.join("\n");
}

/**
 * Get the default target version for an agent (current version)
 */
export function getDefaultTargetVersion(agent: AgentId): string {
  return getCurrentVersion(agent)?.version ?? "1.0";
}

/**
 * Check if adaptation is needed between versions
 */
export function needsAdaptation(
  agent: AgentId,
  fromVersion: string,
  toVersion: string,
): boolean {
  if (fromVersion === toVersion) return false;
  const breakingChanges = getBreakingChangesBetween(
    agent,
    fromVersion,
    toVersion,
  );
  return breakingChanges.length > 0;
}
