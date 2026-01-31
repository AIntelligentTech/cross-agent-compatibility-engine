/**
 * Renderer for Google Gemini CLI skills and commands
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

export class GeminiRenderer extends BaseRenderer {
  readonly agentId: AgentId = "gemini";

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

    // Map activation mode
    if (spec.activation.mode === "manual") {
      preservedSemantics.push("Manual invocation");
    }

    if (spec.activation.mode === "contextual" && spec.activation.triggers) {
      const globs = spec.activation.triggers
        .filter(t => t.type === "glob")
        .map(t => t.pattern)
        .filter(Boolean);
      if (globs.length > 0) {
        frontmatter.globs = globs.length === 1 ? globs[0] : globs;
        preservedSemantics.push("File pattern activation");
      }
    }

    // Map invocation
    if (spec.invocation.slashCommand) {
      frontmatter.slash_command = spec.invocation.slashCommand;
      preservedSemantics.push("Slash command");
    }

    // Map model
    if (spec.metadata?.model) {
      frontmatter.model = spec.metadata.model;
      preservedSemantics.push("Model specification");
    }

    // Map temperature
    if (spec.metadata?.temperature !== undefined) {
      frontmatter.temperature = spec.metadata.temperature;
    }

    // Map max tokens
    if (spec.metadata?.maxTokens) {
      frontmatter.max_tokens = spec.metadata.maxTokens;
    }

    // Map built-in tools
    const allowedTools = spec.execution.allowedTools || [];
    const hasCodeExecution = 
      spec.metadata?.codeExecution || 
      spec.metadata?.tools?.includes("code_execution") ||
      allowedTools.some(t => ["Bash", "Shell", "Terminal", "code_execution"].includes(t)) ||
      spec.capabilities.needsShell;

    if (hasCodeExecution) {
      frontmatter.code_execution = true;
      preservedSemantics.push("Code execution enabled");
    }

    const hasGoogleSearch = 
      spec.metadata?.googleSearch || 
      spec.metadata?.tools?.includes("google_search") ||
      allowedTools.some(t => ["Search", "GoogleSearch", "google_search", "WebSearch"].includes(t)) ||
      spec.capabilities.needsNetwork || 
      spec.capabilities.needsBrowser;

    if (hasGoogleSearch) {
      frontmatter.google_search = true;
      preservedSemantics.push("Google search enabled");
    }

    // Map other tools to tools array
    const otherTools = allowedTools.filter(t => 
      !["Bash", "Shell", "Terminal", "code_execution", "Search", "GoogleSearch", "google_search", "WebSearch"].includes(t)
    );
    if (otherTools.length > 0) {
      frontmatter.tools = otherTools;
      preservedSemantics.push(`Mapped ${otherTools.length} additional tools`);
    }

    // Map include directories
    if (spec.metadata?.includeDirectories) {
      frontmatter.include_directories = spec.metadata.includeDirectories;
      preservedSemantics.push("Multi-directory configuration");
    }

    // Map instruction
    if (spec.metadata?.instruction) {
      frontmatter.instruction = spec.metadata.instruction;
    }

    // Map examples
    if (spec.intent.examples && spec.intent.examples.length > 0) {
      frontmatter.examples = spec.intent.examples;
    }

    // Handle version
    if (spec.version) {
      frontmatter.version = formatVersion(spec.version);
    }

    // Check for losses
    if (spec.metadata?.approvalPolicy) {
      losses.push({
        sourceField: "approvalPolicy",
        description: `Approval policy '${spec.metadata.approvalPolicy}' not directly supported in Gemini`,
        severity: "warning",
        category: "capability",
        recommendation: "Gemini uses built-in safety filters instead",
      });
      suggestions.push("Gemini uses built-in safety filters instead");
    }

    if (spec.metadata?.sandboxMode) {
      losses.push({
        sourceField: "sandboxMode",
        description: `Sandbox mode '${spec.metadata.sandboxMode}' not directly supported`,
        severity: "info",
        category: "capability",
      });
    }

    if (spec.metadata?.mcpServers) {
      losses.push({
        sourceField: "mcpServers",
        description: "MCP server configuration not natively supported",
        severity: "warning",
        category: "capability",
        recommendation: "Consider using Gemini's built-in tools instead",
      });
      suggestions.push("Consider using Gemini's built-in tools instead");
    }

    if (spec.metadata?.subtask) {
      losses.push({
        sourceField: "subtask",
        description: "subtask isolation not supported",
        severity: "info",
        category: "execution",
      });
    }

    // Build body
    let body = spec.body || spec.intent.purpose || "";

    // Add instruction if present and not in body
    if (spec.metadata?.instruction && !body.includes(spec.metadata.instruction)) {
      body = `# ${spec.id}\n\n${spec.metadata.instruction}\n\n${body}`;
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
        return `.gemini/skills/${spec.id}`;
      case "command":
        return `.gemini/commands`;
      case "memory":
        return `.gemini/memory`;
      default:
        return `.gemini`;
    }
  }

  getTargetFilename(spec: ComponentSpec): string {
    switch (spec.componentType) {
      case "skill":
        return "SKILL.md";
      case "command":
        return `${spec.id}.md`;
      case "memory":
        return `${spec.id}.md`;
      default:
        return `${spec.id}.md`;
    }
  }

  private calculateFidelity(spec: ComponentSpec, losses: ConversionLoss[]): number {
    let score = 90; // Base score for Gemini

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
    if (sourceAgentId !== this.agentId) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }
}
