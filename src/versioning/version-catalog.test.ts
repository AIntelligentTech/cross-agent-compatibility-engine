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
  CODEX_VERSIONS,
  GEMINI_VERSIONS,
  OPENCODE_VERSIONS,
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

    test("returns Codex versions", () => {
      const versions = getAgentVersions("codex");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].agent).toBe("codex");
    });

    test("returns Gemini versions", () => {
      const versions = getAgentVersions("gemini");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].agent).toBe("gemini");
    });

    test("returns OpenCode versions", () => {
      const versions = getAgentVersions("opencode");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].agent).toBe("opencode");
    });

    test("returns empty array for unknown agent", () => {
      const versions = getAgentVersions("aider");
      expect(versions).toEqual([]);
    });

    test("returns Codex versions", () => {
      const versions = getAgentVersions("codex");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0]?.agent).toBe("codex");
    });
  });

  describe("getCurrentVersion", () => {
    test("returns current Claude version", () => {
      const current = getCurrentVersion("claude");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("2.1");
    });

    test("returns current Windsurf version", () => {
      const current = getCurrentVersion("windsurf");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("wave-14");
    });

    test("returns current Cursor version", () => {
      const current = getCurrentVersion("cursor");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("3.0");
    });

    test("returns current Codex version (epoch 1.2)", () => {
      const current = getCurrentVersion("codex");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("1.2");
    });

    test("returns current Gemini version", () => {
      const current = getCurrentVersion("gemini");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("0.2");
    });

    test("returns current OpenCode version", () => {
      const current = getCurrentVersion("opencode");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("1.3");
    });

    test("returns current Codex version", () => {
      const current = getCurrentVersion("codex");
      expect(current).toBeDefined();
      expect(current?.isCurrent).toBe(true);
      expect(current?.version).toBe("1.2");
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

    test("returns specific Codex epoch", () => {
      const version = getVersion("codex", "1.1");
      expect(version).toBeDefined();
      expect(version?.version).toBe("1.1");
      expect(version?.agent).toBe("codex");
    });

    test("returns specific Gemini version", () => {
      const version = getVersion("gemini", "0.1");
      expect(version).toBeDefined();
      expect(version?.version).toBe("0.1");
      expect(version?.agent).toBe("gemini");
    });

    test("returns specific OpenCode version", () => {
      const version = getVersion("opencode", "1.2");
      expect(version).toBeDefined();
      expect(version?.version).toBe("1.2");
      expect(version?.agent).toBe("opencode");
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

    test("returns Codex features", () => {
      const features = getAgentFeatures("codex");
      expect(features.length).toBeGreaterThan(0);
      expect(features.some((f) => f.id === "codex-agent-skills")).toBe(true);
    });

    test("returns Gemini features", () => {
      const features = getAgentFeatures("gemini");
      expect(features.length).toBeGreaterThan(0);
      expect(features.some((f) => f.id === "gemini-context")).toBe(true);
    });

    test("returns OpenCode features", () => {
      const features = getAgentFeatures("opencode");
      expect(features.length).toBeGreaterThan(0);
      expect(features.some((f) => f.id === "opencode-skills")).toBe(true);
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

    test("returns Claude 2.1 named-subagents feature", () => {
      const feature = getFeature("claude", "claude-named-subagents");
      expect(feature).toBeDefined();
      expect(feature?.introducedIn).toBe("2.1");
    });

    test("returns Codex agent-skills feature (epoch 1.1)", () => {
      const feature = getFeature("codex", "codex-agent-skills");
      expect(feature).toBeDefined();
      expect(feature?.introducedIn).toBe("1.1");
    });

    test("returns Gemini policy-engine feature", () => {
      const feature = getFeature("gemini", "gemini-policy-engine");
      expect(feature).toBeDefined();
      expect(feature?.introducedIn).toBe("0.2");
    });

    test("returns OpenCode subagents feature", () => {
      const feature = getFeature("opencode", "opencode-subagents");
      expect(feature).toBeDefined();
      expect(feature?.introducedIn).toBe("1.2");
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

    test("claude-effort-levels available in 2.1 (introduced)", () => {
      expect(isFeatureAvailable("claude", "claude-effort-levels", "2.1")).toBe(
        true,
      );
    });

    test("claude-effort-levels not available in 2.0 (before introduction)", () => {
      expect(isFeatureAvailable("claude", "claude-effort-levels", "2.0")).toBe(
        false,
      );
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

    test("cursor-automations available in 2.5 (introduced)", () => {
      expect(isFeatureAvailable("cursor", "cursor-automations", "2.5")).toBe(
        true,
      );
    });

    test("cursor-automations not available in 2.4 (before introduction)", () => {
      expect(isFeatureAvailable("cursor", "cursor-automations", "2.4")).toBe(
        false,
      );
    });

    test("cursor-worktrees available in 3.0 (introduced)", () => {
      expect(isFeatureAvailable("cursor", "cursor-worktrees", "3.0")).toBe(
        true,
      );
    });

    test("windsurf-arena-mode available in wave-14 (introduced)", () => {
      expect(
        isFeatureAvailable("windsurf", "windsurf-arena-mode", "wave-14"),
      ).toBe(true);
    });

    test("windsurf-arena-mode not available in wave-13 (before introduction)", () => {
      expect(
        isFeatureAvailable("windsurf", "windsurf-arena-mode", "wave-13"),
      ).toBe(false);
    });

    test("codex-agent-skills available after introduction (epoch 1.1+)", () => {
      expect(isFeatureAvailable("codex", "codex-agent-skills", "1.0")).toBe(
        false,
      );
      expect(isFeatureAvailable("codex", "codex-agent-skills", "1.1")).toBe(
        true,
      );
      expect(isFeatureAvailable("codex", "codex-agent-skills", "1.2")).toBe(
        true,
      );
    });

    test("gemini-worktrees available in 0.2 (introduced)", () => {
      expect(isFeatureAvailable("gemini", "gemini-worktrees", "0.2")).toBe(
        true,
      );
    });

    test("gemini-worktrees not available in 0.1 (before introduction)", () => {
      expect(isFeatureAvailable("gemini", "gemini-worktrees", "0.1")).toBe(
        false,
      );
    });

    test("opencode-subagents available in 1.2 (introduced)", () => {
      expect(isFeatureAvailable("opencode", "opencode-subagents", "1.2")).toBe(
        true,
      );
    });

    test("opencode-subagents not available in 1.0 (before introduction)", () => {
      expect(isFeatureAvailable("opencode", "opencode-subagents", "1.0")).toBe(
        false,
      );
    });

    test("opencode-plugins available in 1.3 (introduced)", () => {
      expect(isFeatureAvailable("opencode", "opencode-plugins", "1.3")).toBe(
        true,
      );
    });
  });

  describe("getBreakingChanges", () => {
    test("returns Claude breaking changes", () => {
      const changes = getBreakingChanges("claude");
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === "claude-rules-location")).toBe(true);
    });

    test("returns Claude 2.1 commands-merged breaking change", () => {
      const changes = getBreakingChanges("claude");
      expect(changes.some((c) => c.id === "claude-commands-merged")).toBe(true);
    });

    test("returns Cursor breaking changes", () => {
      const changes = getBreakingChanges("cursor");
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === "cursor-rules-migration")).toBe(true);
    });

    test("returns Cursor 3.0 cloud-agents-removed breaking change", () => {
      const changes = getBreakingChanges("cursor");
      expect(changes.some((c) => c.id === "cursor-cloud-agents-removed")).toBe(
        true,
      );
    });

    test("returns Codex breaking changes", () => {
      const changes = getBreakingChanges("codex");
      expect(changes.length).toBeGreaterThan(0);
      expect(
        changes.some((c) => c.id === "codex-custom-prompts-deprecated"),
      ).toBe(true);
    });

    test("returns empty Gemini breaking changes", () => {
      const changes = getBreakingChanges("gemini");
      expect(changes).toEqual([]);
    });

    test("returns empty OpenCode breaking changes", () => {
      const changes = getBreakingChanges("opencode");
      expect(changes).toEqual([]);
    });
  });

  describe("getBreakingChangesBetween", () => {
    test("returns breaking changes between Claude 1.0 and 2.0", () => {
      const changes = getBreakingChangesBetween("claude", "1.0", "2.0");
      expect(changes.length).toBeGreaterThan(0);
      expect(changes.some((c) => c.id === "claude-hooks-format")).toBe(true);
      expect(changes.some((c) => c.id === "claude-rules-location")).toBe(true);
    });

    test("returns breaking changes between Claude 2.0 and 2.1", () => {
      const changes = getBreakingChangesBetween("claude", "2.0", "2.1");
      expect(changes.some((c) => c.id === "claude-commands-merged")).toBe(true);
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

    test("returns cursor-cloud-agents-removed between 2.5 and 3.0", () => {
      const changes = getBreakingChangesBetween("cursor", "2.5", "3.0");
      expect(changes.some((c) => c.id === "cursor-cloud-agents-removed")).toBe(
        true,
      );
    });

    test("returns breaking changes for Codex 1.0 to 1.2 (epoch range)", () => {
      const changes = getBreakingChangesBetween("codex", "1.0", "1.2");
      expect(
        changes.some((c) => c.id === "codex-custom-prompts-deprecated"),
      ).toBe(true);
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
      expect(compareVersions("windsurf", "wave-14", "wave-8")).toBe(1);
    });

    test("Claude 2.0 is before 2.1", () => {
      expect(compareVersions("claude", "2.0", "2.1")).toBe(-1);
    });

    test("Cursor 2.5 is before 3.0", () => {
      expect(compareVersions("cursor", "2.5", "3.0")).toBe(-1);
    });

    test("Codex epoch 1.0 is before 1.2", () => {
      expect(compareVersions("codex", "1.0", "1.2")).toBe(-1);
    });

    test("Gemini 0.1 is before 0.2", () => {
      expect(compareVersions("gemini", "0.1", "0.2")).toBe(-1);
    });

    test("OpenCode 1.0 is before 1.3", () => {
      expect(compareVersions("opencode", "1.0", "1.3")).toBe(-1);
    });

    test("works with Codex versions", () => {
      expect(compareVersions("codex", "1.0", "1.1")).toBe(-1);
      expect(compareVersions("codex", "1.2", "1.1")).toBe(1);
    });
  });

  describe("getVersionSummary", () => {
    test("returns Claude version summary", () => {
      const summary = getVersionSummary("claude");
      expect(summary.agent).toBe("claude");
      expect(summary.versions.length).toBe(CLAUDE_VERSIONS.length);
      expect(summary.currentVersion).toBe("2.1");
      expect(summary.totalFeatures).toBeGreaterThan(0);
      expect(summary.totalBreakingChanges).toBeGreaterThan(0);
    });

    test("returns Windsurf version summary", () => {
      const summary = getVersionSummary("windsurf");
      expect(summary.agent).toBe("windsurf");
      expect(summary.currentVersion).toBe("wave-14");
    });

    test("returns Cursor version summary", () => {
      const summary = getVersionSummary("cursor");
      expect(summary.agent).toBe("cursor");
      expect(summary.currentVersion).toBe("3.0");
      expect(summary.versions.length).toBe(CURSOR_VERSIONS.length);
    });

    test("returns Codex version summary (epoch 1.2 current)", () => {
      const summary = getVersionSummary("codex");
      expect(summary.agent).toBe("codex");
      expect(summary.currentVersion).toBe("1.2");
      expect(summary.versions.length).toBe(CODEX_VERSIONS.length);
      expect(summary.totalFeatures).toBeGreaterThan(0);
    });

    test("returns Gemini version summary", () => {
      const summary = getVersionSummary("gemini");
      expect(summary.agent).toBe("gemini");
      expect(summary.currentVersion).toBe("0.2");
      expect(summary.versions.length).toBe(GEMINI_VERSIONS.length);
      expect(summary.totalFeatures).toBeGreaterThan(0);
    });

    test("returns OpenCode version summary", () => {
      const summary = getVersionSummary("opencode");
      expect(summary.agent).toBe("opencode");
      expect(summary.currentVersion).toBe("1.3");
      expect(summary.versions.length).toBe(OPENCODE_VERSIONS.length);
      expect(summary.totalFeatures).toBeGreaterThan(0);
    });

    test("returns Codex version summary", () => {
      const summary = getVersionSummary("codex");
      expect(summary.agent).toBe("codex");
      expect(summary.currentVersion).toBe("1.2");
      expect(summary.versions.length).toBe(CODEX_VERSIONS.length);
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

    test("all Codex versions have required fields", () => {
      for (const version of CODEX_VERSIONS) {
        expect(version.agent).toBe("codex");
        expect(version.version).toBeDefined();
        expect(typeof version.isCurrent).toBe("boolean");
        expect(typeof version.isSupported).toBe("boolean");
        expect(Array.isArray(version.featuresIntroduced)).toBe(true);
        expect(Array.isArray(version.breakingChanges)).toBe(true);
        expect(Array.isArray(version.detectionMarkers)).toBe(true);
      }
    });

    test("all Gemini versions have required fields", () => {
      for (const version of GEMINI_VERSIONS) {
        expect(version.agent).toBe("gemini");
        expect(version.version).toBeDefined();
        expect(typeof version.isCurrent).toBe("boolean");
        expect(typeof version.isSupported).toBe("boolean");
        expect(Array.isArray(version.featuresIntroduced)).toBe(true);
        expect(Array.isArray(version.breakingChanges)).toBe(true);
        expect(Array.isArray(version.detectionMarkers)).toBe(true);
      }
    });

    test("all OpenCode versions have required fields", () => {
      for (const version of OPENCODE_VERSIONS) {
        expect(version.agent).toBe("opencode");
        expect(version.version).toBeDefined();
        expect(typeof version.isCurrent).toBe("boolean");
        expect(typeof version.isSupported).toBe("boolean");
        expect(Array.isArray(version.featuresIntroduced)).toBe(true);
        expect(Array.isArray(version.breakingChanges)).toBe(true);
        expect(Array.isArray(version.detectionMarkers)).toBe(true);
      }
    });

    test("exactly one current version per agent", () => {
      const claudeCurrent = CLAUDE_VERSIONS.filter((v) => v.isCurrent);
      const windsurfCurrent = WINDSURF_VERSIONS.filter((v) => v.isCurrent);
      const cursorCurrent = CURSOR_VERSIONS.filter((v) => v.isCurrent);
      const codexCurrent = CODEX_VERSIONS.filter((v) => v.isCurrent);
      const geminiCurrent = GEMINI_VERSIONS.filter((v) => v.isCurrent);
      const opencodeCurrent = OPENCODE_VERSIONS.filter((v) => v.isCurrent);

      expect(claudeCurrent.length).toBe(1);
      expect(windsurfCurrent.length).toBe(1);
      expect(cursorCurrent.length).toBe(1);
      expect(codexCurrent.length).toBe(1);
      expect(geminiCurrent.length).toBe(1);
      expect(opencodeCurrent.length).toBe(1);
    });

    test("Claude 2.0 is marked not current (superseded by 2.1)", () => {
      const v20 = CLAUDE_VERSIONS.find((v) => v.version === "2.0");
      expect(v20?.isCurrent).toBe(false);
    });

    test("Windsurf wave-13 is marked not current (superseded by wave-14)", () => {
      const wave13 = WINDSURF_VERSIONS.find((v) => v.version === "wave-13");
      expect(wave13?.isCurrent).toBe(false);
    });

    test("Cursor 2.4 is marked not current (superseded by 3.0)", () => {
      const v24 = CURSOR_VERSIONS.find((v) => v.version === "2.4");
      expect(v24?.isCurrent).toBe(false);
    });

    test("Codex 1.2 epoch features introduced list is correct", () => {
      const v12 = CODEX_VERSIONS.find((v) => v.version === "1.2");
      expect(v12?.featuresIntroduced).toContain("codex-agents-guidance");
      expect(v12?.featuresIntroduced).toContain("codex-team-config");
    });

    test("Gemini 0.1 detection markers include agent file pattern", () => {
      const v01 = GEMINI_VERSIONS.find((v) => v.version === "0.1");
      const agentMarker = v01?.detectionMarkers.find(
        (m) =>
          m.type === "file_pattern" &&
          m.pattern?.includes(".gemini/agents"),
      );
      expect(agentMarker).toBeDefined();
      expect(agentMarker?.weight).toBe(8);
    });

    test("OpenCode 1.3 features include gitlab and session-review", () => {
      const v13 = OPENCODE_VERSIONS.find((v) => v.version === "1.3");
      expect(v13?.featuresIntroduced).toContain("opencode-gitlab");
      expect(v13?.featuresIntroduced).toContain("opencode-session-review");
    });

    test("Claude 2.1 has claude-commands-merged breaking change", () => {
      const v21 = CLAUDE_VERSIONS.find((v) => v.version === "2.1");
      expect(v21?.breakingChanges).toContain("claude-commands-merged");
    });

    test("Cursor 3.0 has cursor-cloud-agents-removed breaking change", () => {
      const v30 = CURSOR_VERSIONS.find((v) => v.version === "3.0");
      expect(v30?.breakingChanges).toContain("cursor-cloud-agents-removed");
    });

    test("Codex 1.2 epoch has custom-prompts-deprecated breaking change", () => {
      const v12 = CODEX_VERSIONS.find((v) => v.version === "1.2");
      expect(v12?.breakingChanges).toContain("codex-custom-prompts-deprecated");
    });
  });
});
