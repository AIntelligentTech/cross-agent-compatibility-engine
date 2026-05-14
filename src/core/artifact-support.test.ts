/**
 * Tests for artifact support matrix (post-May-14 audit posture).
 *
 * The audit reframed several artifacts:
 *  - claude.memory and claude.rule render are "native" (not "none")
 *  - windsurf.skill render is "native" (not "degraded") — native since Wave 13
 *  - AGENTS.md (memory) is supported across cursor, windsurf, codex, gemini,
 *    opencode, and universal as a universal-discovery instruction file
 *  - codex.command/codex.rule and gemini.skill/gemini.command remain "degraded"
 */

import { describe, expect, test } from "bun:test";
import {
  AGENT_ARTIFACT_SUPPORT,
  getArtifactSupport,
  getSupportedComponentTypes,
} from "./artifact-support.js";

describe("Artifact Support (audit 2026-05-14 posture)", () => {
  describe("Claude — render gaps closed", () => {
    test("claude.memory render flipped from none → native", () => {
      const memory = getArtifactSupport("claude", "memory");
      expect(memory.render).toBe("native");
      expect(memory.parse).toBe("native");
    });

    test("claude.rule render flipped from none → native", () => {
      const rule = getArtifactSupport("claude", "rule");
      expect(rule.render).toBe("native");
      expect(rule.parse).toBe("native");
    });

    test("claude.agent now first-class (parse + render)", () => {
      const agent = getArtifactSupport("claude", "agent");
      expect(agent.parse).toBe("native");
      expect(agent.render).toBe("native");
    });
  });

  describe("Windsurf — skill promoted to native", () => {
    test("windsurf.skill render promoted from degraded → native", () => {
      const skill = getArtifactSupport("windsurf", "skill");
      expect(skill.parse).toBe("native");
      expect(skill.render).toBe("native");
    });

    test("windsurf.memory (AGENTS.md auto-discovery) is native", () => {
      const memory = getArtifactSupport("windsurf", "memory");
      expect(memory.parse).toBe("native");
      expect(memory.render).toBe("native");
    });
  });

  describe("Cursor — AGENTS.md + native rule render", () => {
    test("cursor.rule render promoted from degraded → native (.mdc is fully documented)", () => {
      const rule = getArtifactSupport("cursor", "rule");
      expect(rule.parse).toBe("native");
      expect(rule.render).toBe("native");
    });

    test("cursor.memory (AGENTS.md) is native", () => {
      const memory = getArtifactSupport("cursor", "memory");
      expect(memory.parse).toBe("native");
      expect(memory.render).toBe("native");
    });
  });

  describe("Codex — AGENTS.md native; command/rule remain degraded per audit", () => {
    test("codex.memory (AGENTS.md + AGENTS.override.md chain) is native", () => {
      const memory = getArtifactSupport("codex", "memory");
      expect(memory.parse).toBe("native");
      expect(memory.render).toBe("native");
    });

    test("codex.command stays degraded (audit posture)", () => {
      const command = getArtifactSupport("codex", "command");
      expect(command.parse).toBe("degraded");
      expect(command.render).toBe("degraded");
    });

    test("codex.rule stays degraded (audit posture)", () => {
      const rule = getArtifactSupport("codex", "rule");
      expect(rule.parse).toBe("degraded");
      expect(rule.render).toBe("degraded");
    });

    test("codex.skill stays native", () => {
      const skill = getArtifactSupport("codex", "skill");
      expect(skill.parse).toBe("native");
      expect(skill.render).toBe("native");
    });

    test("codex.agent (TOML subagents) is degraded — vendor surface differs", () => {
      const agent = getArtifactSupport("codex", "agent");
      expect(agent.parse).toBe("degraded");
      expect(agent.render).toBe("degraded");
    });
  });

  describe("Gemini — skill/command remain degraded; AGENTS.md alias native", () => {
    test("gemini.skill stays degraded (audit posture)", () => {
      const skill = getArtifactSupport("gemini", "skill");
      expect(skill.parse).toBe("degraded");
      expect(skill.render).toBe("degraded");
    });

    test("gemini.command stays degraded (audit posture)", () => {
      const command = getArtifactSupport("gemini", "command");
      expect(command.parse).toBe("degraded");
      expect(command.render).toBe("degraded");
    });

    test("gemini.memory (GEMINI.md + AGENTS.md alias) is native", () => {
      const memory = getArtifactSupport("gemini", "memory");
      expect(memory.parse).toBe("native");
      expect(memory.render).toBe("native");
    });

    test("gemini.agent (custom subagents) is native", () => {
      const agent = getArtifactSupport("gemini", "agent");
      expect(agent.parse).toBe("native");
      expect(agent.render).toBe("native");
    });
  });

  describe("OpenCode — subagent now validates (mode: subagent required)", () => {
    test("opencode.agent validate flipped from false → true", () => {
      const agent = getArtifactSupport("opencode", "agent");
      expect(agent.validate).toBe(true);
    });

    test("opencode.memory (AGENTS.md primary, CLAUDE.md fallback) is native", () => {
      const memory = getArtifactSupport("opencode", "memory");
      expect(memory.parse).toBe("native");
      expect(memory.render).toBe("native");
    });
  });

  describe("Universal AGENTS.md hook", () => {
    test("All major agents support memory (AGENTS.md/CLAUDE.md/GEMINI.md/etc.) as a universal discovery file", () => {
      const agents = [
        "claude",
        "windsurf",
        "cursor",
        "opencode",
        "codex",
        "gemini",
      ] as const;
      for (const agent of agents) {
        const memory = getArtifactSupport(agent, "memory");
        expect(memory.parse).toBe("native");
        expect(memory.render).toBe("native");
      }
    });
  });

  describe("getSupportedComponentTypes", () => {
    test("claude reports skill/hook/memory/rule/agent", () => {
      const types = getSupportedComponentTypes("claude");
      expect(types).toContain("skill");
      expect(types).toContain("hook");
      expect(types).toContain("memory");
      expect(types).toContain("rule");
      expect(types).toContain("agent");
    });

    test("windsurf reports workflow/rule/hook/skill/memory", () => {
      const types = getSupportedComponentTypes("windsurf");
      expect(types).toContain("workflow");
      expect(types).toContain("rule");
      expect(types).toContain("hook");
      expect(types).toContain("skill");
      expect(types).toContain("memory");
    });

    test("aider returns empty (intentional no-coverage)", () => {
      expect(AGENT_ARTIFACT_SUPPORT.aider).toEqual({});
    });
  });
});
