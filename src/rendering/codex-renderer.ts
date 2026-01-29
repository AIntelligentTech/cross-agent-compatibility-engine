/**
 * Renderer for OpenAI Codex skills and commands
 */

import type {
  AgentId,
  ComponentSpec,
  ConversionReport,
  ConversionLoss,
  ConversionWarning,
} from "../core/types.js";
import { formatVersion } from "../core/types.js";
import { BaseRenderer, type RenderOptions } from "./renderer-interface.js";
import matter from "gray-matter";

export class CodexRenderer extends BaseRenderer {
  readonly agentId: AgentId = "codex";

  render(
    spec: ComponentSpec,
    options?: RenderOptions,
  ): ReturnType<typeof this.createSuccessResult> | ReturnType<typeof this.createErrorResult> {
    const startTime = Date.now();
    const losses: ConversionLoss[] = [];
    const warnings: ConversionWarning[] = [];
    const preservedSemantics: string[] = [];
    const suggestions: string[] = [];

    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      name: spec.id,
      description: spec.intent.summary,
    };

    // Map activation mode to Codex patterns
    if (spec.activation.mode === "manual") {
      // Manual activation is default for commands
      preservedSemantics.push("Manual activation (slash command)");
    }

    if (spec.activation.mode === "contextual" && spec.activation.triggers) {
      const globs = spec.activation.triggers
        .filter(t => t.type === "glob")
        .map(t => t.pattern)
        .filter(Boolean);
      if (globs.length > 0) {
        frontmatter.globs = globs.length === 1 ? globs[0] : globs;
        preservedSemantics.push("File pattern activation via globs");
      }
    }

    // Map invocation
    if (spec.invocation.slashCommand) {
      frontmatter.slash_command = spec.invocation.slashCommand;
      preservedSemantics.push("Slash command invocation");
    }

    if (spec.invocation.argumentHint) {
      frontmatter.argument_hint = spec.invocation.argumentHint;
      preservedSemantics.push("Argument hints");
    }

    // Map model if specified
    if (spec.metadata?.model) {
      frontmatter.model = spec.metadata.model;
      preservedSemantics.push("Model specification");
    }

    // Map approval policy
    if (spec.metadata?.approvalPolicy) {
      frontmatter.approval_policy = spec.metadata.approvalPolicy;
    } else if (spec.activation.safetyLevel === "dangerous") {
      frontmatter.approval_policy = "on-request";
      warnings.push({
        code: "SAFETY_APPROVAL",
        message: "Component marked as dangerous - setting approval_policy to on-request",
      });
    }

    // Map sandbox mode
    if (spec.metadata?.sandboxMode) {
      frontmatter.sandbox_mode = spec.metadata.sandboxMode;
    } else {
      // Infer from safety level
      switch (spec.activation.safetyLevel) {
        case "safe":
          frontmatter.sandbox_mode = "read-only";
          break;
        case "sensitive":
          frontmatter.sandbox_mode = "workspace-write";
          break;
        case "dangerous":
          frontmatter.sandbox_mode = "danger-full-access";
          break;
      }
    }

    // Map web search
    if (spec.metadata?.webSearch) {
      frontmatter.web_search = spec.metadata.webSearch;
    }

    // Map MCP servers
    if (spec.metadata?.mcpServers) {
      frontmatter.mcp_servers = spec.metadata.mcpServers;
      preservedSemantics.push("MCP server configuration");
    }

    // Map tools
    if (spec.metadata?.allowedTools || spec.metadata?.tools) {
      const tools = spec.metadata?.allowedTools || spec.metadata?.tools;
      if (Array.isArray(tools)) {
        frontmatter.tools = tools;
        preservedSemantics.push("Tool permissions");
      }
    }

    // Map features
    if (spec.metadata?.features) {
      frontmatter.features = spec.metadata.features;
    }

    // Handle version
    if (spec.version) {
      frontmatter.version = formatVersion(spec.version);
    }

    // Check for losses
    if (spec.metadata?.subtask) {
      losses.push({
        sourceField: "subtask",
        description: "subtask: true not supported in Codex",
        severity: "warning",
        category: "execution",
        recommendation: "Use sandbox_mode for isolation control",
      });
      suggestions.push("Use sandbox_mode for isolation control");
    }

    if (spec.metadata?.mode) {
      losses.push({
        sourceField: "mode",
        description: `mode: ${spec.metadata.mode} not directly supported`,
        severity: "info",
        category: "metadata",
      });
    }

    // Build body
    let body = spec.body || spec.intent.purpose || "";

    // Add examples if present
    if (spec.intent.examples && spec.intent.examples.length > 0) {
      body += "\n\n## Examples\n\n";
      spec.intent.examples.forEach((example, i) => {
        body += `### Example ${i + 1}\n${example}\n\n`;
      });
    }

    // Render final content
    const rendered = matter.stringify(body, frontmatter);

    // Calculate fidelity
    const fidelityScore = this.calculateFidelity(spec, losses);

    // Build report
    const report: ConversionReport = {
      source: {
        agent: spec.sourceAgent?.id || this.agentId,
        componentType: spec.componentType,
        id: spec.id,
      },
      target: {
        agent: this.agentId,
        componentType: spec.componentType,
        id: spec.id,
      },
      fidelityScore,
      convertedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      losses,
      warnings,
      preservedSemantics,
      suggestions,
    };

    return this.createSuccessResult(
      rendered,
      this.getTargetFilename(spec),
      report,
    );
  }

  getTargetDirectory(spec: ComponentSpec): string {
    switch (spec.componentType) {
      case "skill":
        return `.codex/skills/${spec.id}`;
      case "command":
        return `.codex/commands`;
      case "rule":
        return `.codex/rules`;
      case "memory":
        return `.codex/memory`;
      default:
        return `.codex`;
    }
  }

  getTargetFilename(spec: ComponentSpec): string {
    switch (spec.componentType) {
      case "skill":
        return "SKILL.md";
      case "command":
        return `${spec.id}.md`;
      case "rule":
        return `${spec.id}.md`;
      case "memory":
        return `${spec.id}.md`;
      default:
        return `${spec.id}.md`;
    }
  }

  private calculateFidelity(spec: ComponentSpec, losses: ConversionLoss[]): number {
    let score = 95; // Base score for Codex

    // Deduct for losses
    losses.forEach(loss => {
      switch (loss.severity) {
        case "critical":
          score -= 15;
          break;
        case "warning":
          score -= 8;
          break;
        case "info":
          score -= 3;
          break;
      }
    });

    // Cross-agent penalty
    const sourceAgentId = spec.sourceAgent?.id;
    if (sourceAgentId !== "claude" && sourceAgentId !== this.agentId) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}
