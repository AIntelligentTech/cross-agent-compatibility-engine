import type { AgentId, ComponentType } from "./types.js";

export type ArtifactSupportLevel = "native" | "degraded" | "none";

export interface ArtifactSupport {
  parse: ArtifactSupportLevel;
  render: ArtifactSupportLevel;
  validate: boolean;
}

export type AgentArtifactSupport = Partial<Record<ComponentType, ArtifactSupport>>;

// Support levels are calibrated against the 2026-05-14 audit
// (docs/research/repo-audit-2026-05-14.md). Notes:
// - claude.memory and claude.rule render: "native" — CLAUDE.md is plain
//   Markdown with @import; .claude/rules/*.md is plain Markdown with paths
//   frontmatter. There is no technical reason CACE cannot render either.
// - windsurf.skill render: "native" — Agent Skills shipped natively at
//   .windsurf/skills/<name>/SKILL.md in Wave 13 (2025-12-24).
// - AGENTS.md ("memory") is supported across Cursor, Windsurf, Codex,
//   Gemini, and OpenCode as a universal-discovery instruction file. CACE
//   parses and renders this for every agent that documents the surface.
// - codex.command/codex.rule and gemini.skill/gemini.command remain
//   "degraded": CACE represents them as markdown artifacts, but the vendor
//   surfaces are less canonical than the parse/render machinery assumes.
export const AGENT_ARTIFACT_SUPPORT: Record<AgentId, AgentArtifactSupport> = {
  claude: {
    skill: { parse: "native", render: "native", validate: true },
    hook: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "native", validate: true },
    rule: { parse: "native", render: "native", validate: true },
    agent: { parse: "native", render: "native", validate: true },
  },
  windsurf: {
    workflow: { parse: "native", render: "native", validate: true },
    rule: { parse: "native", render: "native", validate: true },
    hook: { parse: "native", render: "native", validate: true },
    skill: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "native", validate: true },
  },
  cursor: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "native", render: "native", validate: true },
    rule: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "native", validate: true },
  },
  opencode: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "native", render: "native", validate: true },
    agent: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "native", validate: true },
  },
  codex: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "degraded", render: "degraded", validate: true },
    rule: { parse: "degraded", render: "degraded", validate: true },
    memory: { parse: "native", render: "native", validate: true },
    agent: { parse: "degraded", render: "degraded", validate: true },
  },
  gemini: {
    skill: { parse: "degraded", render: "degraded", validate: true },
    command: { parse: "degraded", render: "degraded", validate: true },
    memory: { parse: "native", render: "native", validate: true },
    agent: { parse: "native", render: "native", validate: true },
  },
  universal: {
    memory: { parse: "native", render: "native", validate: false },
  },
  aider: {},
  continue: {},
};

export const REPORTABLE_COMPONENT_TYPES: ComponentType[] = [
  "skill",
  "workflow",
  "command",
  "rule",
  "hook",
  "memory",
  "agent",
];

export function getArtifactSupport(
  agentId: AgentId,
  componentType: ComponentType,
): ArtifactSupport {
  return (
    AGENT_ARTIFACT_SUPPORT[agentId][componentType] ?? {
      parse: "none",
      render: "none",
      validate: false,
    }
  );
}

export function getAgentArtifactSupport(agentId: AgentId): AgentArtifactSupport {
  return AGENT_ARTIFACT_SUPPORT[agentId];
}

export function getSupportedComponentTypes(agentId: AgentId): ComponentType[] {
  return REPORTABLE_COMPONENT_TYPES.filter((componentType) => {
    const support = getArtifactSupport(agentId, componentType);
    return support.parse !== "none" || support.render !== "none" || support.validate;
  });
}

export function supportLevelWeight(level: ArtifactSupportLevel): number {
  switch (level) {
    case "native":
      return 1;
    case "degraded":
      return 0.65;
    default:
      return 0;
  }
}

export function formatSupportLevel(level: ArtifactSupportLevel): string {
  switch (level) {
    case "native":
      return "N";
    case "degraded":
      return "D";
    default:
      return "-";
  }
}
