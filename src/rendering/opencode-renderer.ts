/**
 * OpenCode renderer
 * Renders components to OpenCode format (skills, commands, agents)
 */

import type { ComponentSpec, RenderResult, ConversionReport } from "../core/types.js";
import { BaseRenderer, type RenderOptions } from "./renderer-interface.js";
import matter from "gray-matter";

export class OpenCodeRenderer extends BaseRenderer {
  readonly agentId = "opencode" as const;

  render(spec: ComponentSpec, options?: RenderOptions): RenderResult {
    const startTime = Date.now();
    const warnings: string[] = [];

    // Determine component type mapping
    const componentType = this.mapComponentType(spec.componentType);
    
    // Build frontmatter based on component type
    const frontmatter: Record<string, unknown> = {
      description: spec.intent.summary || spec.intent.purpose,
    };

    // Add type-specific frontmatter
    if (componentType === "skill") {
      if (spec.execution.subAgent) {
        frontmatter.agent = spec.execution.subAgent;
      }
      if (spec.execution.context === "fork") {
        frontmatter.subtask = true;
      }
    }

    if (componentType === "command") {
      // Commands can have agent field too
      if (spec.execution.subAgent) {
        frontmatter.agent = spec.execution.subAgent;
      }
    }

    if (componentType === "agent") {
      if (spec.execution.preferredModel) {
        frontmatter.model = spec.execution.preferredModel;
      }
    }

    // Build body
    let body = spec.body;

    // Adapt body for OpenCode if needed
    if (options?.includeComments) {
      const comment = `<!-- Converted from ${spec.sourceAgent?.id || "unknown"} to OpenCode -->\n<!-- Original: ${spec.metadata?.sourceFile || "unknown"} -->\n\n`;
      body = comment + body;
    }

    // Render to markdown with frontmatter
    const content = matter.stringify(body, frontmatter);

    // Generate filename
    const filename = this.getTargetFilename(spec);

    // Create conversion report
    const report: ConversionReport = {
      source: {
        agent: (spec.sourceAgent?.id || "claude") as import("../core/types.js").AgentId,
        componentType: spec.componentType,
        id: spec.id,
      },
      target: {
        agent: "opencode",
        componentType,
        id: spec.id,
      },
      preservedSemantics: [
        "description",
        "body content",
        ...(spec.execution.subAgent ? ["agent delegation"] : []),
        ...(spec.execution.context === "fork" ? ["subtask isolation"] : []),
      ],
      losses: [],
      warnings: warnings.map(w => ({ code: "RENDER_WARNING", message: w })),
      suggestions: [
        "Review $ARGUMENTS placeholders for command inputs",
        "Verify subtask mode matches your isolation needs",
      ],
      fidelityScore: 95, // OpenCode has good feature parity
      convertedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };

    return this.createSuccessResult(content, filename, report);
  }

  getTargetFilename(spec: ComponentSpec): string {
    const type = this.mapComponentType(spec.componentType);
    
    switch (type) {
      case "skill":
        return `${spec.id}.md`;
      case "command":
        return `${spec.id}.md`;
      case "agent":
        return `${spec.id}.md`;
      default:
        return `${spec.id}.md`;
    }
  }

  getTargetDirectory(spec: ComponentSpec): string {
    const type = this.mapComponentType(spec.componentType);
    
    switch (type) {
      case "skill":
        return ".opencode/skills";
      case "command":
        return ".opencode/commands";
      case "agent":
        return ".opencode/agents";
      default:
        return ".opencode";
    }
  }

  protected mapComponentType(sourceType: ComponentSpec["componentType"]): "skill" | "command" | "agent" {
    const mappings: Record<string, "skill" | "command" | "agent"> = {
      skill: "skill",
      command: "command",
      agent: "agent",
      workflow: "command", // Workflows become commands in OpenCode
      rule: "skill",       // Rules become skills
    };
    
    return mappings[sourceType] || "skill";
  }
}
