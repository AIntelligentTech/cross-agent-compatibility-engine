/**
 * Tests for migration guide generation
 */

import { describe, expect, test } from "bun:test";
import {
  generateMigrationGuide,
  formatMigrationGuideAsMarkdown,
  formatMigrationGuideForCli,
  analyzeMigrationPath,
  getAvailableMigrationPaths,
  getRecommendedUpgradePath,
} from "./migration-guide.js";

describe("Migration Guide", () => {
  describe("generateMigrationGuide", () => {
    test("generates guide for Claude 1.0 to 2.0", () => {
      const guide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(guide).not.toBeNull();
      expect(guide?.fromVersion).toBe("1.0");
      expect(guide?.toVersion).toBe("2.0");
      expect(guide?.agent).toBe("claude");
      expect(guide?.steps.length).toBeGreaterThan(0);
    });

    test("generates guide for Cursor 0.34 to 1.7", () => {
      const guide = generateMigrationGuide("cursor", "0.34", "1.7");
      expect(guide).not.toBeNull();
      expect(guide?.steps.some((s) => s.title.includes("cursorrules"))).toBe(
        true,
      );
    });

    test("returns null for invalid versions", () => {
      const guide = generateMigrationGuide("claude", "99.0", "100.0");
      expect(guide).toBeNull();
    });

    test("generates empty guide for same version", () => {
      const guide = generateMigrationGuide("claude", "1.0", "1.0");
      expect(guide).not.toBeNull();
      expect(guide?.steps.length).toBe(0);
      expect(guide?.overview).toContain("No breaking changes");
    });

    test("generates guide for versions without breaking changes", () => {
      const guide = generateMigrationGuide("windsurf", "wave-1", "wave-8");
      expect(guide).not.toBeNull();
      expect(guide?.steps.length).toBe(0);
      expect(guide?.notes?.some((n) => n.includes("non-breaking"))).toBe(true);
    });

    test("includes before/after examples", () => {
      const guide = generateMigrationGuide("cursor", "0.34", "1.7");
      expect(guide).not.toBeNull();
      const migrationStep = guide?.steps.find(
        (s) => s.before !== undefined || s.after !== undefined,
      );
      expect(migrationStep).toBeDefined();
    });

    test("includes notes for agent-specific guidance", () => {
      const claudeGuide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(claudeGuide?.notes?.some((n) => n.includes("Claude Code"))).toBe(
        true,
      );

      const cursorGuide = generateMigrationGuide("cursor", "0.34", "1.7");
      expect(cursorGuide?.notes?.some((n) => n.includes("Cursor"))).toBe(true);
    });

    test("includes related links", () => {
      const guide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(guide?.links?.length).toBeGreaterThan(0);
      expect(
        guide?.links?.some(
          (l) => l.includes("anthropic") || l.includes("claude"),
        ),
      ).toBe(true);
    });
  });

  describe("formatMigrationGuideAsMarkdown", () => {
    test("formats guide as valid markdown", () => {
      const guide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(guide).not.toBeNull();
      const markdown = formatMigrationGuideAsMarkdown(guide!);

      expect(markdown).toContain("# Migration Guide");
      expect(markdown).toContain("## Overview");
      expect(markdown).toContain("**Agent:** claude");
      expect(markdown).toContain("**From:** 1.0");
      expect(markdown).toContain("**To:** 2.0");
    });

    test("includes step details", () => {
      const guide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(guide).not.toBeNull();
      const markdown = formatMigrationGuideAsMarkdown(guide!);

      expect(markdown).toContain("## Migration Steps");
      expect(markdown).toContain("### Step");
    });

    test("includes code blocks for examples", () => {
      const guide = generateMigrationGuide("cursor", "0.34", "1.7");
      expect(guide).not.toBeNull();
      const markdown = formatMigrationGuideAsMarkdown(guide!);

      expect(markdown).toContain("**Before:**");
      expect(markdown).toContain("**After:**");
      expect(markdown).toContain("```");
    });
  });

  describe("formatMigrationGuideForCli", () => {
    test("formats guide for CLI display", () => {
      const guide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(guide).not.toBeNull();
      const cliOutput = formatMigrationGuideForCli(guide!);

      expect(cliOutput).toContain("Migration Guide");
      expect(cliOutput).toContain("Agent: claude");
      expect(cliOutput).toContain("From:  1.0");
      expect(cliOutput).toContain("To:    2.0");
    });

    test("includes migration steps", () => {
      const guide = generateMigrationGuide("claude", "1.0", "2.0");
      expect(guide).not.toBeNull();
      const cliOutput = formatMigrationGuideForCli(guide!);

      expect(cliOutput).toContain("Migration Steps:");
      expect(cliOutput).toContain("Step");
    });
  });

  describe("analyzeMigrationPath", () => {
    test("returns low complexity for no breaking changes", () => {
      const analysis = analyzeMigrationPath("windsurf", "wave-1", "wave-8");
      expect(analysis.complexity).toBe("low");
      expect(analysis.breakingChanges).toBe(0);
    });

    test("returns complexity based on breaking changes", () => {
      const analysis = analyzeMigrationPath("claude", "1.0", "2.0");
      expect(analysis.breakingChanges).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(analysis.complexity);
    });

    test("counts auto-migratable changes", () => {
      const analysis = analyzeMigrationPath("cursor", "0.34", "1.7");
      expect(analysis.autoMigratable).toBeGreaterThanOrEqual(0);
      expect(analysis.autoMigratable).toBeLessThanOrEqual(
        analysis.breakingChanges,
      );
    });

    test("calculates manual steps", () => {
      const analysis = analyzeMigrationPath("claude", "1.0", "2.0");
      expect(analysis.manualSteps).toBe(
        analysis.breakingChanges - analysis.autoMigratable,
      );
    });

    test("provides estimated effort", () => {
      const analysis = analyzeMigrationPath("claude", "1.0", "2.0");
      expect(analysis.estimatedEffort).toBeDefined();
      expect(analysis.estimatedEffort.length).toBeGreaterThan(0);
    });
  });

  describe("getAvailableMigrationPaths", () => {
    test("returns all possible paths for Claude", () => {
      const paths = getAvailableMigrationPaths("claude");
      expect(paths.length).toBeGreaterThan(0);

      // Should include 1.0 -> 1.5, 1.0 -> 2.0, 1.5 -> 2.0
      expect(paths.some((p) => p.from === "1.0" && p.to === "1.5")).toBe(true);
      expect(paths.some((p) => p.from === "1.0" && p.to === "2.0")).toBe(true);
      expect(paths.some((p) => p.from === "1.5" && p.to === "2.0")).toBe(true);
    });

    test("includes breaking change counts", () => {
      const paths = getAvailableMigrationPaths("claude");
      const path1to2 = paths.find((p) => p.from === "1.0" && p.to === "2.0");
      expect(path1to2?.breakingChanges).toBeGreaterThan(0);
    });

    test("returns empty for agent with no versions", () => {
      const paths = getAvailableMigrationPaths("gemini");
      expect(paths.length).toBe(0);
    });
  });

  describe("getRecommendedUpgradePath", () => {
    test("returns step-by-step path for Claude", () => {
      const path = getRecommendedUpgradePath("claude", "1.0", "2.0");
      expect(path).toEqual(["1.0", "1.5", "2.0"]);
    });

    test("returns single version for adjacent upgrade", () => {
      const path = getRecommendedUpgradePath("claude", "1.0", "1.5");
      expect(path).toEqual(["1.0", "1.5"]);
    });

    test("returns empty for invalid versions", () => {
      const path = getRecommendedUpgradePath("claude", "99.0", "100.0");
      expect(path).toEqual([]);
    });

    test("returns empty for downgrade", () => {
      const path = getRecommendedUpgradePath("claude", "2.0", "1.0");
      expect(path).toEqual([]);
    });

    test("works with Windsurf wave versions", () => {
      const path = getRecommendedUpgradePath("windsurf", "wave-1", "wave-13");
      expect(path.length).toBeGreaterThan(2);
      expect(path[0]).toBe("wave-1");
      expect(path[path.length - 1]).toBe("wave-13");
    });
  });
});
