/**
 * Capability mapping between agents
 */

import type {
  AgentId,
  CapabilityMapping,
  MappingStrategy,
} from "../core/types.js";

// Capability mappings database
const mappings: CapabilityMapping[] = [
  // Claude to Windsurf
  {
    sourceAgent: "claude",
    targetAgent: "windsurf",
    sourceField: "disable-model-invocation",
    strategy: {
      type: "transform",
      transformer: "mapToAutoExecutionMode",
      description:
        "Maps disable-model-invocation: true to auto_execution_mode: 0",
    },
  },
  {
    sourceAgent: "claude",
    targetAgent: "windsurf",
    sourceField: "context: fork",
    strategy: {
      type: "unsupported",
      lossDescription: "Claude fork context has no Windsurf equivalent",
    },
  },
  {
    sourceAgent: "claude",
    targetAgent: "windsurf",
    sourceField: "allowed-tools",
    strategy: {
      type: "fallback",
      fallbackValue: null,
      warning: "Tool restrictions cannot be enforced in Windsurf",
    },
  },
  {
    sourceAgent: "claude",
    targetAgent: "windsurf",
    sourceField: "$ARGUMENTS",
    strategy: {
      type: "transform",
      transformer: "convertArgumentsToProseHint",
      description: "Converts $ARGUMENTS placeholder to prose instruction",
    },
  },

  // Claude to Cursor
  {
    sourceAgent: "claude",
    targetAgent: "cursor",
    sourceField: "disable-model-invocation",
    strategy: {
      type: "fallback",
      fallbackValue: true,
      warning: "Cursor commands are always manual",
    },
  },
  {
    sourceAgent: "claude",
    targetAgent: "cursor",
    sourceField: "context: fork",
    strategy: {
      type: "unsupported",
      lossDescription: "Claude fork context not supported in Cursor",
    },
  },
  {
    sourceAgent: "claude",
    targetAgent: "cursor",
    sourceField: "agent",
    strategy: {
      type: "unsupported",
      lossDescription: "Sub-agent assignment not supported in Cursor",
    },
  },

  // Windsurf to Claude
  {
    sourceAgent: "windsurf",
    targetAgent: "claude",
    sourceField: "auto_execution_mode",
    strategy: {
      type: "transform",
      transformer: "mapFromAutoExecutionMode",
      description: "Maps auto_execution_mode to disable-model-invocation",
    },
  },
  {
    sourceAgent: "windsurf",
    targetAgent: "claude",
    sourceField: "tool_references",
    strategy: {
      type: "transform",
      transformer: "convertToolReferencesToAllowedTools",
      description: "Infers allowed-tools from tool references in body",
    },
  },

  // Windsurf to Cursor
  {
    sourceAgent: "windsurf",
    targetAgent: "cursor",
    sourceField: "auto_execution_mode",
    strategy: {
      type: "fallback",
      fallbackValue: null,
      warning:
        "Cursor commands are always manual - auto_execution_mode ignored",
    },
  },
  {
    sourceAgent: "windsurf",
    targetAgent: "cursor",
    sourceField: "tool_references",
    strategy: {
      type: "transform",
      transformer: "convertToolReferencesToProse",
      description: "Converts tool references to prose instructions",
    },
  },

  // Cursor to Claude
  {
    sourceAgent: "cursor",
    targetAgent: "claude",
    sourceField: "markdown_structure",
    strategy: {
      type: "direct",
      targetField: "body",
    },
  },

  // Cursor to Windsurf
  {
    sourceAgent: "cursor",
    targetAgent: "windsurf",
    sourceField: "markdown_structure",
    strategy: {
      type: "direct",
      targetField: "body",
    },
  },
];

export function getMappings(
  sourceAgent: AgentId,
  targetAgent: AgentId,
): CapabilityMapping[] {
  return mappings.filter(
    (m) => m.sourceAgent === sourceAgent && m.targetAgent === targetAgent,
  );
}

export function getMapping(
  sourceAgent: AgentId,
  targetAgent: AgentId,
  sourceField: string,
): CapabilityMapping | undefined {
  return mappings.find(
    (m) =>
      m.sourceAgent === sourceAgent &&
      m.targetAgent === targetAgent &&
      m.sourceField === sourceField,
  );
}

export function addMapping(mapping: CapabilityMapping): void {
  mappings.push(mapping);
}

export function describeStrategy(strategy: MappingStrategy): string {
  switch (strategy.type) {
    case "direct":
      return `Direct mapping to ${strategy.targetField}`;
    case "transform":
      return strategy.description;
    case "fallback":
      return `Fallback: ${strategy.warning}`;
    case "unsupported":
      return `Unsupported: ${strategy.lossDescription}`;
  }
}

export function getCompatibilityMatrix(): Record<
  AgentId,
  Record<AgentId, number>
> {
  // Include all supported agents with renderers
  const agents: AgentId[] = ["claude", "windsurf", "cursor", "universal"];
  // Agents that are defined but don't have full conversion support yet
  const partialAgents: AgentId[] = ["opencode", "gemini"];
  const allAgents = [...agents, ...partialAgents];
  const matrix: Record<string, Record<string, number>> = {};

  for (const source of allAgents) {
    matrix[source] = {};
    for (const target of allAgents) {
      if (source === target) {
        matrix[source][target] = 100;
        continue;
      }

      // Check if both source and target have full support
      const hasFullSupport = agents.includes(source) && agents.includes(target);

      if (!hasFullSupport) {
        // No conversion support for partial agents yet
        matrix[source][target] = 0;
        continue;
      }

      // Universal (AGENTS.md) has high compatibility with all formats
      if (source === "universal" || target === "universal") {
        // Universal is plain markdown, works everywhere
        matrix[source][target] = 95;
        continue;
      }

      const agentMappings = getMappings(source, target);
      let score = 100;

      for (const mapping of agentMappings) {
        if (mapping.strategy.type === "unsupported") {
          score -= 15;
        } else if (mapping.strategy.type === "fallback") {
          score -= 5;
        } else if (mapping.strategy.type === "transform") {
          score -= 2;
        }
      }

      matrix[source][target] = Math.max(0, score);
    }
  }

  return matrix as Record<AgentId, Record<AgentId, number>>;
}
