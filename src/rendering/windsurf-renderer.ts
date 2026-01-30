/**
 * Renderer for Windsurf (Cascade) workflows
 * 
 * Dual-Output Strategy Support:
 * ==============================
 * This renderer supports the --strategy=dual-output feature for Claude → Windsurf
 * conversion. When enabled, it generates:
 * 
 * 1. Workflow file (.windsurf/workflows/<skill>.md) - for manual /command invocation
 * 2. Skill file (.windsurf/skills/<skill>/SKILL.md) - for auto-invocation parity
 * 
 * This addresses Windsurf's bifurcated model vs Claude's unified skill model where
 * skills can be both auto-invoked AND manually invoked.
 */

import type {
  ComponentSpec,
  ConversionReport,
  ConversionLoss,
  ConversionWarning,
} from "../core/types.js";
import { BaseRenderer, type RenderOptions } from "./renderer-interface.js";

export class WindsurfRenderer extends BaseRenderer {
  readonly agentId = "windsurf" as const;

  render(
    spec: ComponentSpec,
    options?: RenderOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    const startTime = Date.now();
    const losses: ConversionLoss[] = [];
    const warnings: ConversionWarning[] = [];
    const preservedSemantics: string[] = [];
    const suggestions: string[] = [];

    // Build frontmatter
    const frontmatter: Record<string, unknown> = {
      description: spec.intent.summary,
    };

    // CRITICAL: Windsurf workflows do NOT support auto-execution
    // All workflows are slash commands requiring manual user invocation
    // This is a fundamental architectural difference from Claude skills
    if (spec.activation.mode !== "manual") {
      losses.push({
        category: "activation",
        severity: "warning",
        description: `Claude "${spec.activation.mode}" activation mode has no Windsurf equivalent`,
        sourceField: "activation.mode",
        recommendation: "Windsurf workflows are always slash commands (manual invocation only)",
      });
    }

    // Claude user-invocable: false means UI hides but model can still invoke
    // Windsurf has no equivalent - all workflows are visible and user-invocable
    if (spec.invocation.userInvocable === false) {
      losses.push({
        category: "content",
        severity: "info",
        description: "Claude 'user-invocable: false' (UI hide) has no Windsurf equivalent",
        sourceField: "invocation.userInvocable",
        recommendation: "Windsurf workflows are always visible and user-invocable",
      });
    }

    // Claude disable-model-invocation prevents programmatic invocation
    // Windsurf has no equivalent - all workflows can be invoked programmatically
    if (spec.metadata && (spec.metadata as Record<string, unknown>)["disable-model-invocation"] === true) {
      losses.push({
        category: "content",
        severity: "warning",
        description: "Claude 'disable-model-invocation' has no Windsurf equivalent",
        sourceField: "metadata.disable-model-invocation",
        recommendation: "This workflow will be programmatically invokable in Windsurf",
      });
    }

    // Add tags if present
    if (spec.category && spec.category.length > 0) {
      frontmatter["tags"] = spec.category;
    }

    // Check for losses from source agent features
    if (spec.sourceAgent?.id === "claude") {
      // Claude-specific features that don't map
      if (spec.execution.context === "fork") {
        losses.push({
          category: "execution",
          severity: "warning",
          description: 'Claude "fork" context has no Windsurf equivalent',
          sourceField: "execution.context",
          recommendation: "Workflow will run in main context",
        });
      }

      if (spec.execution.subAgent) {
        losses.push({
          category: "execution",
          severity: "warning",
          description: `Sub-agent "${spec.execution.subAgent}" is Claude-specific`,
          sourceField: "execution.subAgent",
          recommendation:
            "Remove sub-agent reference or add as prose instruction",
        });
      }

      if (
        spec.execution.allowedTools &&
        spec.execution.allowedTools.length > 0
      ) {
        warnings.push({
          code: "TOOL_RESTRICTION_LOST",
          message: "Claude tool restrictions cannot be enforced in Windsurf",
          field: "execution.allowedTools",
        });
        suggestions.push(
          "Consider adding tool usage guidance in the workflow body",
        );
      }

      if (spec.invocation.argumentHint) {
        warnings.push({
          code: "ARGUMENT_HINT_DEGRADED",
          message:
            "Claude argument hints become prose instructions in Windsurf",
          field: "invocation.argumentHint",
        });
      }
    }

    // Handle agent-specific overrides
    if (spec.agentOverrides?.windsurf) {
      const override = spec.agentOverrides.windsurf;
      if (override.frontmatterOverrides) {
        Object.assign(frontmatter, override.frontmatterOverrides);
      }
    }

    // Build the output
    const frontmatterYaml = this.buildFrontmatter(frontmatter);
    let body = spec.body;

    // Apply version adaptation if needed
    const versionAdaptation = this.adaptForVersion(body, options);
    body = versionAdaptation.body;
    if (versionAdaptation.adapted) {
      preservedSemantics.push("Version-adapted content");
    }
    for (const w of versionAdaptation.warnings) {
      warnings.push({
        code: "VERSION_ADAPTATION",
        message: w,
        field: "body",
      });
    }

    // Transform Claude-specific syntax
    body = this.transformBody(body, spec);

    // Add prefix/suffix from overrides
    if (spec.agentOverrides?.windsurf?.bodyPrefix) {
      body = spec.agentOverrides.windsurf.bodyPrefix + "\n\n" + body;
    }
    if (spec.agentOverrides?.windsurf?.bodySuffix) {
      body = body + "\n\n" + spec.agentOverrides.windsurf.bodySuffix;
    }

    // Build output.
    // IMPORTANT: Windsurf workflow loaders can require YAML frontmatter to be the
    // first meaningful content in the file. Keep provenance comments AFTER frontmatter.
    let content = frontmatterYaml + "\n";
    if (options?.includeComments) {
      content += `<!-- Converted from ${spec.sourceAgent?.id ?? "unknown"} to Windsurf -->\n`;
      content += `<!-- Original: ${spec.metadata.sourceFile ?? "unknown"} -->\n\n`;
    }
    content += body;

    // Calculate fidelity score
    const fidelityScore = this.calculateFidelity(losses, warnings);

    // Build report
    const report: ConversionReport = {
      ...this.createConversionReport(spec, "windsurf", startTime),
      preservedSemantics,
      losses,
      warnings,
      suggestions,
      fidelityScore,
    };

    const filename = this.getTargetFilename(spec);
    return this.createSuccessResult(content.trim() + "\n", filename, report);
  }

  renderDualOutput(
    spec: ComponentSpec,
    options?: RenderOptions,
  ): { workflowContent: string; skillContent: string; workflowFilename: string; skillFilename: string; report: ConversionReport } {
    // Render the skill (auto-invocation format)
    const skillResult = this.render(spec, options);
    
    if (!skillResult.success || !skillResult.content) {
      throw new Error("Failed to render skill content for dual-output");
    }

    // Render the workflow (manual invocation format)
    const workflowSpec = { ...spec, componentType: "workflow" as const };
    const workflowResult = this.render(workflowSpec, options);

    if (!workflowResult.success || !workflowResult.content) {
      throw new Error("Failed to render workflow content for dual-output");
    }

    // Add workflow-specific adaptation
    let adaptedWorkflow = workflowResult.content;
    if (!adaptedWorkflow.includes("## Usage")) {
      adaptedWorkflow = adaptedWorkflow.replace(
        /(\n---)/,
        `\n---\n> **Manual Invocation**: This workflow is invoked via /${spec.id}\n> For automatic invocation, use the skill file instead.\n`,
      );
    }

    return {
      workflowContent: adaptedWorkflow,
      skillContent: skillResult.content,
      workflowFilename: `${spec.id}-workflow.md`,
      skillFilename: `${spec.id}/SKILL.md`,
      report: skillResult.report!,
    };
  }

  getTargetFilename(spec: ComponentSpec): string {
    return `${spec.id}.md`;
  }

  getTargetDirectory(spec: ComponentSpec): string {
    if (spec.componentType === "rule") {
      return ".windsurf/rules";
    }
    return ".windsurf/workflows";
  }

  protected override mapComponentType(
    sourceType: ComponentSpec["componentType"],
  ): "workflow" | "rule" {
    if (sourceType === "rule") return "rule";
    return "workflow";
  }

  private transformBody(body: string, spec: ComponentSpec): string {
    let transformed = body;

    // Transform Claude $ARGUMENTS placeholder to prose
    if (transformed.includes("$ARGUMENTS")) {
      transformed = transformed.replace(
        /\$ARGUMENTS/g,
        "<user-provided arguments>",
      );
      if (spec.invocation.argumentHint) {
        // Add argument hint as a note
        transformed =
          `> **Arguments**: ${spec.invocation.argumentHint}\n\n` + transformed;
      }
    }

    // Transform Claude shell injection syntax !`command`
    transformed = transformed.replace(/!\`([^`]+)\`/g, "(run: `$1`)");

    return transformed;
  }

  private buildFrontmatter(data: Record<string, unknown>): string {
    const lines: string[] = ["---"];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      } else if (typeof value === "boolean") {
        lines.push(`${key}: ${value}`);
      } else if (typeof value === "string") {
        if (
          value.includes(":") ||
          value.includes("#") ||
          value.includes("\n")
        ) {
          lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    lines.push("---");
    return lines.join("\n");
  }

  private calculateFidelity(
    losses: ConversionLoss[],
    warnings: ConversionWarning[],
  ): number {
    let score = 100;

    for (const loss of losses) {
      if (loss.category === "activation" && loss.severity === "warning") {
        score -= 5; // Auto-execution not supported is expected
      } else if (loss.severity === "critical") {
        score -= 20;
      } else if (loss.severity === "warning") {
        score -= 10;
      } else {
        score -= 5;
      }
    }

    for (const _warning of warnings) {
      score -= 3;
    }

    return Math.max(0, score);
  }
}
