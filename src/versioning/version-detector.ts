/**
 * Version detection logic for each agent
 */

import matter from "gray-matter";
import type { AgentId } from "../core/types.js";
import type {
  VersionDetectionResult,
  VersionDetectionMarker,
} from "./types.js";
import { getAgentVersions, getCurrentVersion } from "./version-catalog.js";

// ============================================================================
// Detection Context
// ============================================================================

interface DetectionContext {
  /** Raw file content */
  content: string;
  /** Parsed frontmatter (if any) */
  frontmatter: Record<string, unknown>;
  /** File path (if available) */
  filePath?: string;
  /** Body content (without frontmatter) */
  body: string;
}

function createDetectionContext(
  content: string,
  filePath?: string,
): DetectionContext {
  let frontmatter: Record<string, unknown> = {};
  let body = content;

  try {
    const parsed = matter(content);
    frontmatter = parsed.data as Record<string, unknown>;
    body = parsed.content;
  } catch {
    // No frontmatter, use full content as body
  }

  return { content, frontmatter, filePath, body };
}

// ============================================================================
// Marker Evaluation
// ============================================================================

function evaluateMarker(
  marker: VersionDetectionMarker,
  context: DetectionContext,
): { matched: boolean; description: string } {
  switch (marker.type) {
    case "field_present":
      return {
        matched:
          marker.field !== undefined && marker.field in context.frontmatter,
        description: `Field "${marker.field}" is present`,
      };

    case "field_absent":
      return {
        matched:
          marker.field !== undefined && !(marker.field in context.frontmatter),
        description: `Field "${marker.field}" is absent`,
      };

    case "field_value":
      return {
        matched:
          marker.field !== undefined &&
          context.frontmatter[marker.field] === marker.value,
        description: `Field "${marker.field}" equals ${JSON.stringify(marker.value)}`,
      };

    case "file_pattern":
      if (!context.filePath || !marker.pattern) {
        return { matched: false, description: "No file path to match" };
      }
      const regex = new RegExp(marker.pattern);
      return {
        matched: regex.test(context.filePath),
        description: `File path matches pattern "${marker.pattern}"`,
      };

    case "syntax_pattern":
      if (!marker.pattern) {
        return { matched: false, description: "No pattern specified" };
      }
      const syntaxRegex = new RegExp(marker.pattern, "m");
      return {
        matched: syntaxRegex.test(context.content),
        description: `Content matches syntax pattern "${marker.pattern}"`,
      };

    case "structure_pattern":
      if (!marker.pattern) {
        return { matched: false, description: "No pattern specified" };
      }
      const structRegex = new RegExp(marker.pattern, "m");
      return {
        matched: structRegex.test(context.body),
        description: `Body matches structure pattern "${marker.pattern}"`,
      };

    default:
      return { matched: false, description: "Unknown marker type" };
  }
}

// ============================================================================
// Agent-Specific Detection
// ============================================================================

/**
 * Detect Claude Code version from content
 */
export function detectClaudeVersion(
  content: string,
  filePath?: string,
): VersionDetectionResult {
  const context = createDetectionContext(content, filePath);
  const versions = getAgentVersions("claude");
  const scores: Map<string, { score: number; markers: string[] }> = new Map();

  // Initialize scores
  for (const version of versions) {
    scores.set(version.version, { score: 0, markers: [] });
  }

  // Evaluate markers for each version
  for (const version of versions) {
    const versionScore = scores.get(version.version)!;

    for (const marker of version.detectionMarkers) {
      const result = evaluateMarker(marker, context);
      if (result.matched) {
        versionScore.score += marker.weight;
        versionScore.markers.push(result.description);
      }
    }
  }

  // Additional Claude-specific heuristics
  const fm = context.frontmatter;

  // Check for agent field (v1.5+)
  if ("agent" in fm) {
    const v15 = scores.get("1.5");
    if (v15) {
      v15.score += 5;
      v15.markers.push('Has "agent" field (v1.5+ feature)');
    }
  }

  // Check for model field (v1.5+)
  if ("model" in fm) {
    const v15 = scores.get("1.5");
    if (v15) {
      v15.score += 3;
      v15.markers.push('Has "model" field (v1.5+ feature)');
    }
  }

  // Check for .claude/rules/ path pattern (v2.0+)
  if (filePath?.includes(".claude/rules/")) {
    const v20 = scores.get("2.0");
    if (v20) {
      v20.score += 10;
      v20.markers.push("File in .claude/rules/ directory (v2.0+ feature)");
    }
  }

  // Check for effort/shell/plugins frontmatter (v2.1 era features)
  if ("effort" in fm || "shell" in fm || "plugins" in fm) {
    const v21 = scores.get("2.1");
    if (v21) {
      v21.score += 8;
      v21.markers.push("Has v2.1 era frontmatter fields (effort/shell/plugins)");
    }
  }

  // Find best match
  let bestVersion = getCurrentVersion("claude")?.version ?? "2.1";
  let bestScore = 0;
  let bestMarkers: string[] = [];

  for (const [version, data] of scores) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestVersion = version;
      bestMarkers = data.markers;
    }
  }

  // Calculate confidence
  const maxPossibleScore = versions.reduce(
    (sum, v) => sum + v.detectionMarkers.reduce((s, m) => s + m.weight, 0),
    0,
  );
  const confidence =
    maxPossibleScore > 0
      ? Math.min(100, (bestScore / maxPossibleScore) * 100 + 50)
      : 50;

  return {
    version: bestVersion,
    confidence: Math.round(confidence),
    matchedMarkers: bestMarkers,
    isDefinitive: bestScore >= 10,
  };
}

/**
 * Detect Windsurf version from content
 */
export function detectWindsurfVersion(
  content: string,
  filePath?: string,
): VersionDetectionResult {
  const context = createDetectionContext(content, filePath);
  const versions = getAgentVersions("windsurf");
  const scores: Map<string, { score: number; markers: string[] }> = new Map();

  // Initialize scores
  for (const version of versions) {
    scores.set(version.version, { score: 0, markers: [] });
  }

  // Evaluate markers for each version
  for (const version of versions) {
    const versionScore = scores.get(version.version)!;

    for (const marker of version.detectionMarkers) {
      const result = evaluateMarker(marker, context);
      if (result.matched) {
        versionScore.score += marker.weight;
        versionScore.markers.push(result.description);
      }
    }
  }

  // Additional Windsurf-specific heuristics
  const fm = context.frontmatter;

  // Check for auto_execution_mode (wave-8+, legacy)
  if ("auto_execution_mode" in fm) {
    const wave8 = scores.get("wave-8");
    if (wave8) {
      wave8.score += 5;
      wave8.markers.push('Has "auto_execution_mode" field (wave-8+ feature, legacy)');
    }
  }

  // Check for .windsurf/skills/ path pattern (wave-10+)
  if (filePath?.includes(".windsurf/skills/")) {
    const wave10 = scores.get("wave-10");
    if (wave10) {
      wave10.score += 8;
      wave10.markers.push(
        "File in .windsurf/skills/ directory (wave-10+ feature)",
      );
    }
  }

  // Check for .agents/skills/ path — wave-14 added this support
  if (filePath?.includes(".agents/skills/")) {
    const wave14 = scores.get("wave-14");
    if (wave14) {
      wave14.score += 8;
      wave14.markers.push(
        "File in .agents/skills/ directory (wave-14+ feature)",
      );
    }
  }

  // Check for arena mode or plan mode markers (wave-14)
  if (
    context.content.includes("arena_mode") ||
    context.content.includes("plan_mode")
  ) {
    const wave14 = scores.get("wave-14");
    if (wave14) {
      wave14.score += 6;
      wave14.markers.push("Has wave-14 mode markers (arena_mode/plan_mode)");
    }
  }

  // Find best match
  let bestVersion = getCurrentVersion("windsurf")?.version ?? "wave-14";
  let bestScore = 0;
  let bestMarkers: string[] = [];

  for (const [version, data] of scores) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestVersion = version;
      bestMarkers = data.markers;
    }
  }

  // Calculate confidence
  const confidence = bestScore > 0 ? Math.min(100, bestScore * 10 + 40) : 40;

  return {
    version: bestVersion,
    confidence: Math.round(confidence),
    matchedMarkers: bestMarkers,
    isDefinitive: bestScore >= 8,
  };
}

/**
 * Detect Cursor version from content
 */
export function detectCursorVersion(
  content: string,
  filePath?: string,
): VersionDetectionResult {
  const context = createDetectionContext(content, filePath);
  const versions = getAgentVersions("cursor");
  const scores: Map<string, { score: number; markers: string[] }> = new Map();

  // Initialize scores
  for (const version of versions) {
    scores.set(version.version, { score: 0, markers: [] });
  }

  // Evaluate markers for each version
  for (const version of versions) {
    const versionScore = scores.get(version.version)!;

    for (const marker of version.detectionMarkers) {
      const result = evaluateMarker(marker, context);
      if (result.matched) {
        versionScore.score += marker.weight;
        versionScore.markers.push(result.description);
      }
    }
  }

  // Additional Cursor-specific heuristics

  // Check for .cursorrules file (v0.34 - v1.6, deprecated in v1.7)
  if (filePath?.match(/\.cursorrules$/)) {
    const v034 = scores.get("0.34");
    if (v034) {
      v034.score += 8;
      v034.markers.push(
        "Is .cursorrules file (v0.34+ format, deprecated in v1.7)",
      );
    }
  }

  // Check for .cursor/rules/*.mdc (v1.7+)
  if (filePath?.match(/\.cursor\/rules\/.*\.mdc$/)) {
    const v17 = scores.get("1.7");
    if (v17) {
      v17.score += 10;
      v17.markers.push("Is .mdc rule file (v1.7+ format)");
    }
  }

  // Check for .cursor/commands/ (v1.6+)
  if (filePath?.includes(".cursor/commands/")) {
    const v16 = scores.get("1.6");
    if (v16) {
      v16.score += 8;
      v16.markers.push("File in .cursor/commands/ directory (v1.6+ feature)");
    }
  }

  // Check for .cursor/skills/<name>/SKILL.md (v2.4+)
  if (filePath?.match(/\.cursor\/skills\/[^/]+\/SKILL\.md$/)) {
    const v24 = scores.get("2.4");
    if (v24) {
      v24.score += 12;
      v24.markers.push("Is Cursor skill file (.cursor/skills/<name>/SKILL.md) (v2.4+)");
    }
  }

  // Check for Cursor 3.0 markers: /worktree, agents-window references
  if (
    context.content.includes("/worktree") ||
    context.content.includes("/best-of-n") ||
    context.content.includes("agents_window") ||
    context.content.includes("design_mode")
  ) {
    const v30 = scores.get("3.0");
    if (v30) {
      v30.score += 10;
      v30.markers.push("Has Cursor 3.0 markers (/worktree, /best-of-n, agents_window, design_mode)");
    }
  }

  // Find best match
  let bestVersion = getCurrentVersion("cursor")?.version ?? "3.0";
  let bestScore = 0;
  let bestMarkers: string[] = [];

  for (const [version, data] of scores) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestVersion = version;
      bestMarkers = data.markers;
    }
  }

  // Calculate confidence
  const confidence = bestScore > 0 ? Math.min(100, bestScore * 10 + 40) : 40;

  return {
    version: bestVersion,
    confidence: Math.round(confidence),
    matchedMarkers: bestMarkers,
    isDefinitive: bestScore >= 8,
  };
}

/**
 * Detect Codex CLI version from content
 */
export function detectCodexVersion(
  content: string,
  filePath?: string,
): VersionDetectionResult {
  const context = createDetectionContext(content, filePath);
  const fm = context.frontmatter;
  const matchedMarkers: string[] = [];
  let score = 0;

  // Primary path marker: .agents/skills/ (Codex native)
  if (filePath?.includes(".agents/skills/")) {
    score += 12;
    matchedMarkers.push("File in .agents/skills/ directory (Codex native path)");
  }

  // AGENTS.md or AGENTS.override.md
  if (filePath?.endsWith("AGENTS.md") || filePath?.endsWith("AGENTS.override.md")) {
    score += 8;
    matchedMarkers.push("Is AGENTS.md or AGENTS.override.md (Codex guidance model)");
  }

  // approval_policy field
  if ("approval_policy" in fm) {
    score += 8;
    matchedMarkers.push("Has approval_policy field (Codex-specific)");
  }

  // sandbox_mode field
  if ("sandbox_mode" in fm) {
    score += 8;
    matchedMarkers.push("Has sandbox_mode field (Codex-specific)");
  }

  // .codex/agents/ for subagents (TOML format)
  if (filePath?.includes(".codex/agents/")) {
    score += 10;
    matchedMarkers.push("File in .codex/agents/ directory (Codex subagent TOML)");
  }

  // Plugin config marker
  if ("plugins" in fm || context.content.includes("/plugins")) {
    score += 4;
    matchedMarkers.push("Has plugin configuration (Codex plugins feature)");
  }

  const versions = getAgentVersions("codex");
  let bestVersion = getCurrentVersion("codex")?.version ?? "0.2";

  // If version catalog has entries, try to score them too
  if (versions.length > 0) {
    const scores: Map<string, { score: number; markers: string[] }> = new Map();
    for (const version of versions) {
      scores.set(version.version, { score: 0, markers: [] });
    }
    for (const version of versions) {
      const versionScore = scores.get(version.version)!;
      for (const marker of version.detectionMarkers) {
        const result = evaluateMarker(marker, context);
        if (result.matched) {
          versionScore.score += marker.weight;
          versionScore.markers.push(result.description);
        }
      }
    }
    let catalogBestScore = 0;
    for (const [version, data] of scores) {
      if (data.score > catalogBestScore) {
        catalogBestScore = data.score;
        bestVersion = version;
        matchedMarkers.push(...data.markers);
      }
    }
  }

  const confidence = score > 0 ? Math.min(100, score * 6 + 30) : 30;

  return {
    version: bestVersion,
    confidence: Math.round(confidence),
    matchedMarkers,
    isDefinitive: score >= 10,
  };
}

/**
 * Detect Gemini CLI version from content
 */
export function detectGeminiVersion(
  content: string,
  filePath?: string,
): VersionDetectionResult {
  const context = createDetectionContext(content, filePath);
  const matchedMarkers: string[] = [];
  let score = 0;

  // GEMINI.md — primary context file
  if (filePath?.endsWith("GEMINI.md")) {
    score += 12;
    matchedMarkers.push("Is GEMINI.md (Gemini CLI primary context file)");
  }

  // .gemini/skills/ path
  if (filePath?.includes(".gemini/skills/")) {
    score += 12;
    matchedMarkers.push("File in .gemini/skills/ directory (Gemini CLI native)");
  }

  // .gemini/agents/ path
  if (filePath?.includes(".gemini/agents/")) {
    score += 12;
    matchedMarkers.push("File in .gemini/agents/ directory (Gemini CLI subagents)");
  }

  // .agents/skills/ alias (Gemini also reads this)
  if (filePath?.includes(".agents/skills/")) {
    score += 6;
    matchedMarkers.push("File in .agents/skills/ (Gemini CLI alias path)");
  }

  // policy.toml marker
  if (filePath?.endsWith("policy.toml")) {
    score += 8;
    matchedMarkers.push("Is policy.toml (Gemini CLI policy configuration)");
  }

  // Built-in agent references
  const builtInAgents = [
    "codebase_investigator",
    "cli_help",
    "generalist",
  ];
  for (const agent of builtInAgents) {
    if (context.content.includes(agent)) {
      score += 4;
      matchedMarkers.push(`References built-in Gemini agent: ${agent}`);
      break;
    }
  }

  const versions = getAgentVersions("gemini");
  let bestVersion = getCurrentVersion("gemini")?.version ?? "0.36";

  if (versions.length > 0) {
    const scores: Map<string, { score: number; markers: string[] }> = new Map();
    for (const version of versions) {
      scores.set(version.version, { score: 0, markers: [] });
    }
    for (const version of versions) {
      const versionScore = scores.get(version.version)!;
      for (const marker of version.detectionMarkers) {
        const result = evaluateMarker(marker, context);
        if (result.matched) {
          versionScore.score += marker.weight;
          versionScore.markers.push(result.description);
        }
      }
    }
    let catalogBestScore = 0;
    for (const [version, data] of scores) {
      if (data.score > catalogBestScore) {
        catalogBestScore = data.score;
        bestVersion = version;
        matchedMarkers.push(...data.markers);
      }
    }
  }

  const confidence = score > 0 ? Math.min(100, score * 6 + 30) : 30;

  return {
    version: bestVersion,
    confidence: Math.round(confidence),
    matchedMarkers,
    isDefinitive: score >= 10,
  };
}

/**
 * Detect OpenCode version from content
 */
export function detectOpenCodeVersion(
  content: string,
  filePath?: string,
): VersionDetectionResult {
  const context = createDetectionContext(content, filePath);
  const fm = context.frontmatter;
  const matchedMarkers: string[] = [];
  let score = 0;

  // .opencode/skills/ path
  if (filePath?.includes(".opencode/skills/")) {
    score += 12;
    matchedMarkers.push("File in .opencode/skills/ directory (OpenCode native)");
  }

  // .opencode/ path (general)
  if (filePath?.includes(".opencode/")) {
    score += 6;
    matchedMarkers.push("File in .opencode/ directory");
  }

  // AGENTS.md as primary rules file
  if (filePath?.endsWith("AGENTS.md")) {
    score += 6;
    matchedMarkers.push("Is AGENTS.md (OpenCode primary rules file)");
  }

  // .claude/skills/ cross-compat path
  if (filePath?.includes(".claude/skills/")) {
    score += 4;
    matchedMarkers.push("File in .claude/skills/ (OpenCode cross-compat read)");
  }

  // .agents/skills/ path (OpenCode reads this)
  if (filePath?.includes(".agents/skills/")) {
    score += 6;
    matchedMarkers.push("File in .agents/skills/ (OpenCode reads via Agent Skills standard)");
  }

  // OpenCode-specific frontmatter: subtask, permission patterns
  if ("subtask" in fm) {
    score += 8;
    matchedMarkers.push("Has subtask field (OpenCode-specific)");
  }

  // OPENCODE_DISABLE env var reference
  if (context.content.includes("OPENCODE_DISABLE")) {
    score += 6;
    matchedMarkers.push("References OPENCODE_DISABLE env vars (OpenCode compat)");
  }

  const versions = getAgentVersions("opencode");
  let bestVersion = getCurrentVersion("opencode")?.version ?? "1.3";

  if (versions.length > 0) {
    const scores: Map<string, { score: number; markers: string[] }> = new Map();
    for (const version of versions) {
      scores.set(version.version, { score: 0, markers: [] });
    }
    for (const version of versions) {
      const versionScore = scores.get(version.version)!;
      for (const marker of version.detectionMarkers) {
        const result = evaluateMarker(marker, context);
        if (result.matched) {
          versionScore.score += marker.weight;
          versionScore.markers.push(result.description);
        }
      }
    }
    let catalogBestScore = 0;
    for (const [version, data] of scores) {
      if (data.score > catalogBestScore) {
        catalogBestScore = data.score;
        bestVersion = version;
        matchedMarkers.push(...data.markers);
      }
    }
  }

  const confidence = score > 0 ? Math.min(100, score * 6 + 30) : 30;

  return {
    version: bestVersion,
    confidence: Math.round(confidence),
    matchedMarkers,
    isDefinitive: score >= 10,
  };
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect version for any agent
 */
export function detectVersion(
  agent: AgentId,
  content: string,
  filePath?: string,
): VersionDetectionResult {
  switch (agent) {
    case "claude":
      return detectClaudeVersion(content, filePath);
    case "windsurf":
      return detectWindsurfVersion(content, filePath);
    case "cursor":
      return detectCursorVersion(content, filePath);
    case "codex":
      return detectCodexVersion(content, filePath);
    case "gemini":
      return detectGeminiVersion(content, filePath);
    case "opencode":
      return detectOpenCodeVersion(content, filePath);
    default: {
      // For agents without version catalogs, return current version with low confidence
      const current = getCurrentVersion(agent);
      return {
        version: current?.version ?? "1.0",
        confidence: 30,
        matchedMarkers: [],
        isDefinitive: false,
      };
    }
  }
}

/**
 * Get a human-readable version detection summary
 */
export function getVersionDetectionSummary(
  result: VersionDetectionResult,
): string {
  const confidenceLabel =
    result.confidence >= 80
      ? "high"
      : result.confidence >= 50
        ? "medium"
        : "low";

  let summary = `Detected version: ${result.version} (${confidenceLabel} confidence: ${result.confidence}%)`;

  if (result.matchedMarkers.length > 0) {
    summary += "\nMatched indicators:";
    for (const marker of result.matchedMarkers) {
      summary += `\n  - ${marker}`;
    }
  }

  if (!result.isDefinitive) {
    summary +=
      "\n\nNote: This detection is heuristic. Specify explicit version if needed.";
  }

  return summary;
}
