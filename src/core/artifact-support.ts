import type { AgentId, ComponentType } from "./types.js";

export type ArtifactSupportLevel = "native" | "degraded" | "none";

export interface ArtifactSupport {
  parse: ArtifactSupportLevel;
  render: ArtifactSupportLevel;
  validate: boolean;
}

export type AgentArtifactSupport = Partial<Record<ComponentType, ArtifactSupport>>;

export const AGENT_ARTIFACT_SUPPORT: Record<AgentId, AgentArtifactSupport> = {
  claude: {
    skill: { parse: "native", render: "native", validate: true },
    hook: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "none", validate: true },
    rule: { parse: "native", render: "none", validate: true },
  },
  windsurf: {
    workflow: { parse: "native", render: "native", validate: true },
    rule: { parse: "native", render: "native", validate: true },
    hook: { parse: "native", render: "native", validate: true },
    skill: { parse: "native", render: "degraded", validate: true },
  },
  cursor: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "native", render: "native", validate: true },
    rule: { parse: "native", render: "degraded", validate: true },
  },
  opencode: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "native", render: "native", validate: true },
    agent: { parse: "native", render: "native", validate: false },
  },
  codex: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "native", render: "native", validate: true },
    rule: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "native", validate: true },
  },
  gemini: {
    skill: { parse: "native", render: "native", validate: true },
    command: { parse: "native", render: "native", validate: true },
    memory: { parse: "native", render: "native", validate: true },
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
