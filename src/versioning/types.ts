/**
 * Types for version awareness system
 */

import type { AgentId, SemanticVersion } from "../core/types.js";

// ============================================================================
// Version Identifiers
// ============================================================================

/**
 * Named version identifier for an agent
 * Uses named versions rather than strict semver since agents don't consistently use semver
 */
export interface AgentVersion {
  /** Agent this version belongs to */
  agent: AgentId;
  /** Named version identifier (e.g., "2.0", "wave-13", "1.6") */
  name: string;
  /** Semantic version if available */
  semver?: SemanticVersion;
  /** Release date (ISO string) */
  releaseDate?: string;
  /** Human-readable description */
  description?: string;
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature availability per version
 */
export interface FeatureFlag {
  /** Feature identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Feature description */
  description: string;
  /** Version this feature was introduced */
  introducedIn: string;
  /** Version this feature was deprecated (if applicable) */
  deprecatedIn?: string;
  /** Version this feature was removed (if applicable) */
  removedIn?: string;
}

// ============================================================================
// Breaking Changes
// ============================================================================

export type BreakingChangeType =
  | "field_renamed"
  | "field_removed"
  | "field_added_required"
  | "format_changed"
  | "location_changed"
  | "behavior_changed"
  | "syntax_changed";

export interface BreakingChange {
  /** Unique identifier */
  id: string;
  /** Type of breaking change */
  type: BreakingChangeType;
  /** Version where this change occurred */
  version: string;
  /** What changed */
  description: string;
  /** Affected field or feature */
  affected: string;
  /** Migration path description */
  migration: string;
  /** Whether automatic migration is possible */
  autoMigratable: boolean;
  /** Transform function name if auto-migratable */
  transformFn?: string;
}

// ============================================================================
// Version Catalog Entry
// ============================================================================

export interface VersionCatalogEntry {
  /** Agent identifier */
  agent: AgentId;
  /** Named version */
  version: string;
  /** Semantic version if available */
  semver?: SemanticVersion;
  /** Release date */
  releaseDate?: string;
  /** Whether this is the current/latest version */
  isCurrent: boolean;
  /** Whether this version is still supported */
  isSupported: boolean;
  /** Features introduced in this version */
  featuresIntroduced: string[];
  /** Features deprecated in this version */
  featuresDeprecated: string[];
  /** Features removed in this version */
  featuresRemoved: string[];
  /** Breaking changes in this version */
  breakingChanges: string[];
  /** Detection markers for this version */
  detectionMarkers: VersionDetectionMarker[];
}

// ============================================================================
// Version Detection
// ============================================================================

export type DetectionMarkerType =
  | "field_present"
  | "field_absent"
  | "field_value"
  | "file_pattern"
  | "syntax_pattern"
  | "structure_pattern";

export interface VersionDetectionMarker {
  /** Type of detection marker */
  type: DetectionMarkerType;
  /** Field name (for field-based markers) */
  field?: string;
  /** Expected value (for field_value markers) */
  value?: unknown;
  /** Pattern (for pattern-based markers) */
  pattern?: string;
  /** Weight for scoring (higher = more confident) */
  weight: number;
  /** Whether this marker indicates version or later */
  indicatesVersionOrLater: boolean;
}

export interface VersionDetectionResult {
  /** Detected version name */
  version: string;
  /** Confidence score (0-100) */
  confidence: number;
  /** Markers that matched */
  matchedMarkers: string[];
  /** Whether detection is definitive or heuristic */
  isDefinitive: boolean;
}

// ============================================================================
// Migration
// ============================================================================

export interface MigrationPath {
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Agent this migration applies to */
  agent: AgentId;
  /** Steps required for migration */
  steps: MigrationStep[];
  /** Overall complexity (1-10) */
  complexity: number;
  /** Whether this can be fully automated */
  fullyAutomatable: boolean;
}

export interface MigrationStep {
  /** Step order */
  order: number;
  /** Step description */
  description: string;
  /** Breaking change this addresses (if any) */
  breakingChangeId?: string;
  /** Whether this step is automated */
  automated: boolean;
  /** Manual instructions if not automated */
  manualInstructions?: string;
  /** Transform function if automated */
  transformFn?: string;
}

export interface MigrationGuide {
  /** Source version */
  fromVersion: string;
  /** Target version */
  toVersion: string;
  /** Agent */
  agent: AgentId;
  /** Guide title */
  title: string;
  /** Overview description */
  overview: string;
  /** Detailed steps */
  steps: MigrationGuideStep[];
  /** Additional notes */
  notes?: string[];
  /** Related documentation links */
  links?: string[];
}

export interface MigrationGuideStep {
  /** Step number */
  step: number;
  /** Step title */
  title: string;
  /** Detailed description */
  description: string;
  /** Code example before */
  before?: string;
  /** Code example after */
  after?: string;
  /** Whether this is a breaking change */
  isBreaking: boolean;
}

// ============================================================================
// Version Adapter
// ============================================================================

export interface VersionAdapter {
  /** Agent this adapter handles */
  agent: AgentId;
  /** Source version range */
  sourceVersions: string[];
  /** Target version */
  targetVersion: string;
  /** Apply version-specific transformations */
  adapt: (content: string, fromVersion: string) => VersionAdaptResult;
}

export interface VersionAdaptResult {
  /** Adapted content */
  content: string;
  /** Transformations applied */
  transformations: string[];
  /** Warnings about potential issues */
  warnings: string[];
  /** Whether any breaking changes were encountered */
  hasBreakingChanges: boolean;
}
