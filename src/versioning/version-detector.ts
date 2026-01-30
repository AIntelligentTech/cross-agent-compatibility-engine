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
    const v15 = scores.get("1.5")!;
    v15.score += 5;
    v15.markers.push('Has "agent" field (v1.5+ feature)');
  }

  // Check for model field (v1.5+)
  if ("model" in fm) {
    const v15 = scores.get("1.5")!;
    v15.score += 3;
    v15.markers.push('Has "model" field (v1.5+ feature)');
  }

  // Check for .claude/rules/ path pattern (v2.0+)
  if (filePath?.includes(".claude/rules/")) {
    const v20 = scores.get("2.0")!;
    v20.score += 10;
    v20.markers.push("File in .claude/rules/ directory (v2.0+ feature)");
  }

  // Find best match
  let bestVersion = getCurrentVersion("claude")?.version ?? "2.0";
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

  // Check for auto_execution_mode (wave-8+)
  if ("auto_execution_mode" in fm) {
    const wave8 = scores.get("wave-8")!;
    wave8.score += 5;
    wave8.markers.push('Has "auto_execution_mode" field (wave-8+ feature)');
  }

  // Check for .windsurf/skills/ path pattern (wave-10+)
  if (filePath?.includes(".windsurf/skills/")) {
    const wave10 = scores.get("wave-10")!;
    wave10.score += 8;
    wave10.markers.push(
      "File in .windsurf/skills/ directory (wave-10+ feature)",
    );
  }

  // Find best match
  let bestVersion = getCurrentVersion("windsurf")?.version ?? "wave-13";
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
    const v034 = scores.get("0.34")!;
    v034.score += 8;
    v034.markers.push(
      "Is .cursorrules file (v0.34+ format, deprecated in v1.7)",
    );
  }

  // Check for .cursor/rules/*.mdc (v1.7+)
  if (filePath?.match(/\.cursor\/rules\/.*\.mdc$/)) {
    const v17 = scores.get("1.7")!;
    v17.score += 10;
    v17.markers.push("Is .mdc rule file (v1.7+ format)");
  }

  // Check for .cursor/commands/ (v1.6+)
  if (filePath?.includes(".cursor/commands/")) {
    const v16 = scores.get("1.6")!;
    v16.score += 8;
    v16.markers.push("File in .cursor/commands/ directory (v1.6+ feature)");
  }

  // Check for .cursor/skills/<name>/SKILL.md (v2.4+)
  if (filePath?.match(/\.cursor\/skills\/[^/]+\/SKILL\.md$/)) {
    const v24 = scores.get("2.4");
    if (v24) {
      v24.score += 12;
      v24.markers.push("Is Cursor skill file (.cursor/skills/<name>/SKILL.md) (v2.4+)");
    }
  }

  // Find best match
  let bestVersion = getCurrentVersion("cursor")?.version ?? "2.3";
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
    default:
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
