/**
 * Tests for version catalog
 */

import { describe, expect, test } from "bun:test";
import {
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
  CLAUDE_VERSIONS,
  WINDSURF_VERSIONS,
  CURSOR_VERSIONS,
} from "./version-catalog.js";

describe("Version Catalog", () => {
  describe("getAgentVersions", () => {
    test("returns Claude versions", () => {
      const versions = getAgentVersions("claude");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].agent).toBe("claude");
    });

    test("returns Windsurf versions", () => {
      const versions = getAgentVersions("windsurf");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].agent).toBe("windsurf");
    });

    test("returns Cursor versions", () => {
      const versions = getAgentVersions("cursor");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].agent).toBe("cursor");
    });

    test("returns empty array for unknown agent", () => {
      const versions = getAgentVersions("gemini");
      expect(versions).toEqual([]);
    });
  });

  describe("getCurrentVersion", () => {
    test("returns current Claude version", () => {
      const current = getCurrentVersion("claude");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("2.0");
    });

    test("returns current Windsurf version", () => {
      const current = getCurrentVersion("windsurf");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("wave-13");
    });

    test("returns current Cursor version", () => {
      const current = getCurrentVersion("cursor");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("2.4");
    });
  });

  describe("getVersion", () => {
    test("returns specific Claude version", () => {
      const version = getVersion("claude", "1.5");
      expect(version).toBeDefined();
      expect(version?.version).toBe("1.5");
      expect(version?.agent).toBe("claude");
    });

    test("returns undefined for non-existent version", () => {
      const version = getVersion("claude", "99.99");
      expect(version).toBeUndefined();
    });
  });

  describe("getAgentFeatures", () => {
    test("returns Claude features", () => {
      const features = getAgentFeatures("claude");
      expect(features.length).toBeGreaterThan(0);
      expect(features.some((f) => f.id === "claude-skills")).toBe(true);
    });

    test("returns Windsurf features", () => {
      const features = getAgentFeatures("windsurf");
      expect(features.length).toBeGreaterThan(0);
      expect(features.some((f) => f.id === "windsurf-workflows")).toBe(true);
    });

    test("returns Cursor features", () => {
      const features = getAgentFeatures("cursor");
      expect(features.length).toBeGreaterThan(0);
      expect(features.some((f) => f.id === "cursor-commands")).toBe(true);
    });
  });

  describe("getFeature", () => {
    test("returns specific Claude feature", () => {
      const feature = getFeature("claude", "claude-hooks");
      expect(feature).toBeDefined();
      expect(feature?.name).toBe("Hooks");
      expect(feature?.introducedIn).toBe("1.5");
    });

    test("returns undefined for non-existent feature", () => {
      const feature = getFeature("claude", "claude-nonexistent");
      expect(feature).toBeUndefined();
    });
  });

  describe("isFeatureAvailable", () => {
    test("claude-skills available in 1.0", () => {
      expect(isFeatureAvailable("claude", "claude-skills", "1.0")).toBe(true);
    });

    test("claude-hooks available in 1.5 (introduced)", () => {
      expect(isFeatureAvailable("claude", "claude-hooks", "1.5")).toBe(true);
    });

    test("claude-hooks available in 2.0 (later version)", () => {
      expect(isFeatureAvailable("claude", "claude-hooks", "2.0")).toBe(true);
    });

    test("claude-hooks not available in 1.0 (before introduction)", () => {
      expect(isFeatureAvailable("claude", "claude-hooks", "1.0")).toBe(false);
    });

    test("cursor-cursorrules deprecated but still available before removal", () => {
      // cursor-cursorrules was introduced in 0.34, deprecated in 1.7, not removed
      expect(isFeatureAvailable("cursor", "cursor-cursorrules", "0.34")).toBe(
        true,
      );
      expect(isFeatureAvailable("cursor", "cursor-cursorrules", "1.6")).toBe(
        true,
      );
      expect(isFeatureAvailable("cursor", "cursor-cursorrules", "1.7")).toBe(
        true,
      ); // deprecated but not removed
    });
  });

  describe("getBreakingChanges", () => {
    test("returns Claude breaking changes", () => {
      const changes = getBreakingChanges("claude");
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === "claude-rules-location")).toBe(true);
    });

    test("returns Cursor breaking changes", () => {
      const changes = getBreakingChanges("cursor");
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === "cursor-rules-migration")).toBe(true);
    });
  });

  describe("getBreakingChangesBetween", () => {
    test("returns breaking changes between Claude 1.0 and 2.0", () => {
      const changes = getBreakingChangesBetween("claude", "1.0", "2.0");
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === "claude-hooks-format")).toBe(true);
      expect(changes.some((c) => c.id === "claude-rules-location")).toBe(true);
    });

    test("returns empty for same version", () => {
      const changes = getBreakingChangesBetween("claude", "1.0", "1.0");
      expect(changes.length).toBe(0);
    });

    test("returns empty for versions without breaking changes", () => {
      const changes = getBreakingChangesBetween("windsurf", "wave-1", "wave-8");
      expect(changes.length).toBe(0);
    });

    test("returns breaking changes for Cursor 0.34 to 1.7", () => {
      const changes = getBreakingChangesBetween("cursor", "0.34", "1.7");
      expect(changes.some((c) => c.id === "cursor-rules-migration")).toBe(true);
    });
  });

  describe("compareVersions", () => {
    test("returns -1 for earlier version", () => {
      expect(compareVersions("claude", "1.0", "1.5")).toBe(-1);
    });

    test("returns 1 for later version", () => {
      expect(compareVersions("claude", "2.0", "1.0")).toBe(1);
    });

    test("returns 0 for same version", () => {
      expect(compareVersions("claude", "1.5", "1.5")).toBe(0);
    });

    test("works with Windsurf wave versions", () => {
      expect(compareVersions("windsurf", "wave-1", "wave-8")).toBe(-1);
      expect(compareVersions("windsurf", "wave-13", "wave-8")).toBe(1);
    });
  });

  describe("getVersionSummary", () => {
    test("returns Claude version summary", () => {
      const summary = getVersionSummary("claude");
      expect(summary.agent).toBe("claude");
      expect(summary.versions.length).toBe(CLAUDE_VERSIONS.length);
      expect(summary.currentVersion).toBe("2.0");
      expect(summary.totalFeatures).toBeGreaterThan(0);
      expect(summary.totalBreakingChanges).toBeGreaterThan(0);
    });

    test("returns Windsurf version summary", () => {
      const summary = getVersionSummary("windsurf");
      expect(summary.agent).toBe("windsurf");
      expect(summary.currentVersion).toBe("wave-13");
    });
  });

  describe("Version Catalog Data Integrity", () => {
    test("all Claude versions have required fields", () => {
      for (const version of CLAUDE_VERSIONS) {
        expect(version.agent).toBe("claude");
        expect(version.version).toBeDefined();
        expect(typeof version.isCurrent).toBe("boolean");
        expect(typeof version.isSupported).toBe("boolean");
        expect(Array.isArray(version.featuresIntroduced)).toBe(true);
        expect(Array.isArray(version.breakingChanges)).toBe(true);
        expect(Array.isArray(version.detectionMarkers)).toBe(true);
      }
    });

    test("all Windsurf versions have required fields", () => {
      for (const version of WINDSURF_VERSIONS) {
        expect(version.agent).toBe("windsurf");
        expect(version.version).toBeDefined();
        expect(typeof version.isCurrent).toBe("boolean");
        expect(typeof version.isSupported).toBe("boolean");
      }
    });

    test("all Cursor versions have required fields", () => {
      for (const version of CURSOR_VERSIONS) {
        expect(version.agent).toBe("cursor");
        expect(version.version).toBeDefined();
        expect(typeof version.isCurrent).toBe("boolean");
        expect(typeof version.isSupported).toBe("boolean");
      }
    });

    test("exactly one current version per agent", () => {
      const claudeCurrent = CLAUDE_VERSIONS.filter((v) => v.isCurrent);
      const windsurfCurrent = WINDSURF_VERSIONS.filter((v) => v.isCurrent);
      const cursorCurrent = CURSOR_VERSIONS.filter((v) => v.isCurrent);

      expect(claudeCurrent.length).toBe(1);
      expect(windsurfCurrent.length).toBe(1);
      expect(cursorCurrent.length).toBe(1);
    });
  });
});
