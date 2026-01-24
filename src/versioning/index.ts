/**
 * Version awareness module for cross-agent compatibility
 *
 * Provides version detection, adaptation, and migration capabilities
 * for Claude Code, Windsurf, and Cursor agents.
 */

// Types
export type {
  AgentVersion,
  FeatureFlag,
  BreakingChange,
  BreakingChangeType,
  VersionCatalogEntry,
  VersionDetectionMarker,
  VersionDetectionResult,
  DetectionMarkerType,
  MigrationPath,
  MigrationStep,
  MigrationGuide,
  MigrationGuideStep,
  VersionAdapter,
  VersionAdaptResult,
} from "./types.js";

// Version Catalog
export {
  CLAUDE_VERSIONS,
  CLAUDE_FEATURES,
  CLAUDE_BREAKING_CHANGES,
  WINDSURF_VERSIONS,
  WINDSURF_FEATURES,
  WINDSURF_BREAKING_CHANGES,
  CURSOR_VERSIONS,
  CURSOR_FEATURES,
  CURSOR_BREAKING_CHANGES,
  getAgentVersions,
  getCurrentVersion,
  getVersion,
  getAgentFeatures,
  getFeature,
  isFeatureAvailable,
  getBreakingChanges,
  getBreakingChangesBetween,
  compareVersions,
  getVersionSummary,
} from "./version-catalog.js";

// Version Detection
export {
  detectVersion,
  detectClaudeVersion,
  detectWindsurfVersion,
  detectCursorVersion,
  getVersionDetectionSummary,
} from "./version-detector.js";

// Version Adaptation
export {
  adaptVersion,
  getDefaultTargetVersion,
  needsAdaptation,
} from "./version-adapter.js";

// Migration Guides
export {
  generateMigrationGuide,
  formatMigrationGuideAsMarkdown,
  formatMigrationGuideForCli,
  analyzeMigrationPath,
  getAvailableMigrationPaths,
  getRecommendedUpgradePath,
} from "./migration-guide.js";
