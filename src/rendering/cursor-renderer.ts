/**
 * Renderer for Cursor artifacts.
 *
 * Cursor supports BOTH:
 * - Commands: `.cursor/commands/<name>.md` (manual, slash-command invoked)
 * - Skills:   `.cursor/skills/<name>/SKILL.md` (agent-decided by default, can be forced manual via `disable-model-invocation`)
 *
 * Cursor also supports Claude-compat skill discovery from `.claude/skills/` (see Cursor docs),
 * but CACE emits native Cursor locations by default.
 */

import type {
  ComponentSpec,
  ConversionReport,
  ConversionLoss,
  ConversionWarning,
} from "../core/types.js";
import { formatVersion } from "../core/types.js";
import { BaseRenderer, type RenderOptions } from "./renderer-interface.js";

export class CursorRenderer extends BaseRenderer {
  readonly agentId = "cursor" as const;

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

    // Cursor skills are YAML-frontmatter + markdown body (Agent Skills standard)
    if (spec.componentType === "skill") {
      const frontmatter: Record<string, unknown> = {
        name: spec.id,
        description: spec.intent.summary,
      };

      // Activation mapping: Cursor skills are auto-applied by default.
      // `disable-model-invocation: true` forces manual-only (similar to Cursor commands).
      if (spec.activation.mode === "manual") {
        frontmatter["disable-model-invocation"] = true;
        preservedSemantics.push("Manual-only invocation (disable-model-invocation)");
      } else {
        preservedSemantics.push("Automatic/progressive skill invocation");
      }

      // Version if non-default
      if (
        spec.version.major !== 1 ||
        spec.version.minor !== 0 ||
        spec.version.patch !== 0
      ) {
        frontmatter["version"] = formatVersion(spec.version);
      }

      // Cursor Skills spec supports optional fields like `metadata`, but Cursor does not
      // document enforcement for Claude-only fields such as `allowed-tools` or `context`.
      if (spec.execution.context === "fork") {
        losses.push({
          category: "execution",
          severity: "warning",
          description: 'Claude "fork" context has no Cursor equivalent',
          sourceField: "execution.context",
        });
      }
      if (spec.execution.subAgent) {
        losses.push({
          category: "execution",
          severity: "warning",
          description: `Sub-agent "${spec.execution.subAgent}" is not supported in Cursor skills`,
          sourceField: "execution.subAgent",
        });
      }
      if (spec.execution.allowedTools && spec.execution.allowedTools.length > 0) {
        losses.push({
          category: "capability",
          severity: "warning",
          description:
            "Tool restrictions cannot be enforced in Cursor skills (no documented equivalent)",
          sourceField: "execution.allowedTools",
        });
      }

      preservedSemantics.push("Skill instructions and workflow");
      preservedSemantics.push("Skill name/description metadata");

      let body = spec.body;
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

      // Build output. For Skill.md, YAML frontmatter MUST be the first block.
      let content = this.buildFrontmatter(frontmatter) + "\n";
      if (options?.includeComments) {
        content += `<!-- Converted from ${spec.sourceAgent?.id ?? "unknown"} to Cursor Skill -->\n`;
        content += `<!-- Original: ${spec.metadata.sourceFile ?? "unknown"} -->\n\n`;
      }
      content += body.trim() + "\n";

      const fidelityScore = this.calculateFidelity(losses, warnings);
      const report: ConversionReport = {
        ...this.createConversionReport(spec, "cursor", startTime),
        preservedSemantics,
        losses,
        warnings,
        suggestions,
        fidelityScore,
      };

      const filename = this.getTargetFilename(spec);
      return this.createSuccessResult(content, filename, report);
    }

    // Cursor commands are plain markdown with conventional structure
    // No frontmatter required

    // Check for losses - Cursor commands have limited features vs Claude skills
    if (spec.sourceAgent?.id === "claude") {
      // Many Claude features don't map
      if (spec.activation.mode !== "manual") {
        losses.push({
          category: "activation",
          severity: "warning",
          description:
            "Cursor commands are always manual - auto/suggested activation lost",
          sourceField: "activation.mode",
          recommendation:
            "All Cursor commands require explicit /command invocation",
        });
      }

      if (spec.execution.context === "fork") {
        losses.push({
          category: "execution",
          severity: "warning",
          description: 'Claude "fork" context has no Cursor equivalent',
          sourceField: "execution.context",
        });
      }

      if (spec.execution.subAgent) {
        losses.push({
          category: "execution",
          severity: "warning",
          description: `Sub-agent "${spec.execution.subAgent}" is not supported in Cursor`,
          sourceField: "execution.subAgent",
        });
      }

      if (
        spec.execution.allowedTools &&
        spec.execution.allowedTools.length > 0
      ) {
        losses.push({
          category: "capability",
          severity: "warning",
          description: "Tool restrictions cannot be enforced in Cursor",
          sourceField: "execution.allowedTools",
        });
      }

      if (spec.invocation.argumentHint) {
        warnings.push({
          code: "NO_STRUCTURED_ARGS",
          message:
            "Cursor has no structured argument system - hint converted to prose",
          field: "invocation.argumentHint",
        });
      }
    }

    if (spec.sourceAgent?.id === "windsurf") {
      if (spec.activation.mode !== "manual") {
        losses.push({
          category: "activation",
          severity: "info",
          description: "Windsurf auto_execution_mode not supported in Cursor",
          sourceField: "activation.mode",
        });
      }
    }

    preservedSemantics.push("Core workflow instructions");
    preservedSemantics.push("Semantic intent and purpose");

    // Build the Cursor command structure
    let content = "";

    // Add conversion comment if requested
    if (options?.includeComments) {
      content += `<!-- Converted from ${spec.sourceAgent?.id ?? "unknown"} to Cursor -->\n`;
      content += `<!-- Original: ${spec.metadata.sourceFile ?? "unknown"} -->\n\n`;
    }

    // Title
    const title = this.formatTitle(spec.id);
    content += `# ${title}\n\n`;

    // Objective section
    content += `## Objective\n\n`;
    content += `${spec.intent.purpose}\n\n`;

    // When to use (if available)
    if (
      spec.intent.whenToUse &&
      spec.intent.whenToUse !== spec.intent.purpose
    ) {
      content += `## When to Use\n\n`;
      content += `${spec.intent.whenToUse}\n\n`;
    }

    // Arguments section (if any)
    if (
      spec.invocation.argumentHint ||
      (spec.arguments && spec.arguments.length > 0)
    ) {
      content += `## Arguments\n\n`;
      if (spec.invocation.argumentHint) {
        content += `Expected input: ${spec.invocation.argumentHint}\n\n`;
      }
      if (spec.arguments && spec.arguments.length > 0) {
        for (const arg of spec.arguments) {
          const required = arg.required ? "(required)" : "(optional)";
          content += `- **${arg.name}** ${required}: ${arg.description ?? "No description"}\n`;
        }
        content += "\n";
      }
    }

    // Requirements/Instructions section
    content += `## Requirements\n\n`;

    // Transform the body
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

    body = this.transformBody(body, spec);
    content += body;

    // Handle agent-specific overrides
    if (spec.agentOverrides?.cursor) {
      const override = spec.agentOverrides.cursor;
      if (override.bodyPrefix) {
        content = override.bodyPrefix + "\n\n" + content;
      }
      if (override.bodySuffix) {
        content = content + "\n\n" + override.bodySuffix;
      }
    }

    // Calculate fidelity score
    const fidelityScore = this.calculateFidelity(losses, warnings);

    // Build report
    const report: ConversionReport = {
      ...this.createConversionReport(spec, "cursor", startTime),
      preservedSemantics,
      losses,
      warnings,
      suggestions,
      fidelityScore,
    };

    const filename = this.getTargetFilename(spec);
    return this.createSuccessResult(content.trim() + "\n", filename, report);
  }

  getTargetFilename(spec: ComponentSpec): string {
    if (spec.componentType === "skill") {
      return `${spec.id}/SKILL.md`;
    }
    return `${spec.id}.md`;
  }

  getTargetDirectory(_spec: ComponentSpec): string {
    if (_spec.componentType === "skill") {
      return ".cursor/skills";
    }
    return ".cursor/commands";
  }

  private formatTitle(id: string): string {
    // Convert kebab-case to Title Case
    return id
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private transformBody(body: string, _spec: ComponentSpec): string {
    let transformed = body;

    // Transform Claude $ARGUMENTS placeholder
    transformed = transformed.replace(/\$ARGUMENTS/g, "{user input}");

    // Transform Claude shell injection syntax !`command`
    transformed = transformed.replace(/!\`([^`]+)\`/g, "`$1`");

    // Remove Windsurf-specific tool references and make them prose
    transformed = transformed.replace(
      /\b(code_search|grep_search|find_by_name|read_file|write_to_file|run_command|browser_preview)\b/g,
      (match) => {
        const toolNames: Record<string, string> = {
          code_search: "search the codebase",
          grep_search: "search for patterns",
          find_by_name: "find files",
          read_file: "read files",
          write_to_file: "write files",
          run_command: "run commands",
          browser_preview: "preview in browser",
        };
        return toolNames[match] ?? match;
      },
    );

    return transformed;
  }

  private calculateFidelity(
    losses: ConversionLoss[],
    warnings: ConversionWarning[],
  ): number {
    let score = 100;

    for (const loss of losses) {
      if (loss.severity === "critical") score -= 20;
      else if (loss.severity === "warning") score -= 10;
      else score -= 5;
    }

    for (const _warning of warnings) {
      score -= 3;
    }

    return Math.max(0, score);
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
        if (value.includes(":") || value.includes("#") || value.includes("\n")) {
          lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${key}: ${value}`);
        }
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }

    lines.push("---");
    return lines.join("\n");
  }
}
