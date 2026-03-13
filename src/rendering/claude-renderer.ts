/**
 * Renderer for Claude Code skills
 */

import type {
  ComponentSpec,
  ConversionReport,
  ConversionLoss,
  ConversionWarning,
} from "../core/types.js";
import { formatVersion } from "../core/types.js";
import {
  cloneRawConfig,
  mergeRawFrontmatter,
} from "../core/component-preservation.js";
import { BaseRenderer, type RenderOptions } from "./renderer-interface.js";

export class ClaudeRenderer extends BaseRenderer {
  readonly agentId = "claude" as const;

  render(
    spec: ComponentSpec,
    options?: RenderOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    if (spec.componentType === "hook") {
      return this.renderHooks(spec);
    }

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
      frontmatter["disable-model-invocation"] = true;
      preservedSemantics.push("Manual activation mode");
    } else {
      preservedSemantics.push("Auto/suggested activation mode");
    }

    // Map invocation
    if (spec.invocation.userInvocable) {
      frontmatter["user-invocable"] = true;
    }

    if (spec.invocation.argumentHint) {
      frontmatter["argument-hint"] = spec.invocation.argumentHint;
      preservedSemantics.push("Argument hint");
    }

    // Map execution context
    if (spec.execution.context === "fork") {
      frontmatter["context"] = "fork";
      preservedSemantics.push("Fork execution context");
    }

    if (spec.execution.allowedTools && spec.execution.allowedTools.length > 0) {
      frontmatter["allowed-tools"] = spec.execution.allowedTools;
      preservedSemantics.push("Tool restrictions");
    }

    if (spec.execution.preferredModel) {
      frontmatter["model"] = spec.execution.preferredModel;
      preservedSemantics.push("Preferred model");
    }

    if (spec.execution.subAgent) {
      frontmatter["agent"] = spec.execution.subAgent;
      preservedSemantics.push("Sub-agent assignment");
    }

    // Add version if not 1.0.0
    if (
      spec.version.major !== 1 ||
      spec.version.minor !== 0 ||
      spec.version.patch !== 0
    ) {
      frontmatter["version"] = formatVersion(spec.version);
    }

    // Check for losses from source agent features
    if (spec.sourceAgent?.id === "windsurf") {
      // Windsurf auto_execution_mode doesn't map perfectly
      if (
        spec.activation.mode === "auto" ||
        spec.activation.mode === "contextual"
      ) {
        warnings.push({
          code: "ACTIVATION_DEGRADED",
          message:
            "Windsurf auto_execution_mode mapped to suggested activation",
          field: "activation.mode",
        });
      }
    }

    if (spec.sourceAgent?.id === "cursor") {
      // Cursor has no structured arguments
      losses.push({
        category: "content",
        severity: "info",
        description: "Cursor commands have no structured argument system",
        sourceField: "invocation.arguments",
        recommendation: "Arguments will be handled via $ARGUMENTS placeholder",
      });
    }

    // Handle agent-specific overrides
    if (spec.agentOverrides?.claude) {
      const override = spec.agentOverrides.claude;
      if (override.frontmatterOverrides) {
        Object.assign(frontmatter, override.frontmatterOverrides);
      }
    }

    const mergedFrontmatter =
      options?.preserveOriginalMetadata === false
        ? frontmatter
        : mergeRawFrontmatter(frontmatter, spec.metadata, [
            "name",
            "description",
            "disable-model-invocation",
            "user-invocable",
            "argument-hint",
            "context",
            "allowed-tools",
            "model",
            "agent",
            "version",
          ]);

    // Build the output
    const frontmatterYaml = this.buildFrontmatter(mergedFrontmatter);
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

    // Add prefix/suffix from overrides
    if (spec.agentOverrides?.claude?.bodyPrefix) {
      body = spec.agentOverrides.claude.bodyPrefix + "\n\n" + body;
    }
    if (spec.agentOverrides?.claude?.bodySuffix) {
      body = body + "\n\n" + spec.agentOverrides.claude.bodySuffix;
    }

    // Build output.
    // IMPORTANT: YAML frontmatter must remain the first meaningful content in the file
    // for strict loaders/parsers (and for consistency across agents).
    let content = frontmatterYaml + "\n";
    if (options?.includeComments) {
      content += `<!-- Converted from ${spec.sourceAgent?.id ?? "unknown"} to Claude Code -->\n`;
      content += `<!-- Original: ${spec.metadata.sourceFile ?? "unknown"} -->\n\n`;
    }
    content += body;

    // Calculate fidelity score
    const fidelityScore = this.calculateFidelity(losses, warnings);

    // Build report
    const report: ConversionReport = {
      ...this.createConversionReport(spec, "claude", startTime),
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
    if (spec.componentType === "hook") {
      return "settings.json";
    }
    return `${spec.id}/SKILL.md`;
  }

  getTargetDirectory(_spec: ComponentSpec): string {
    if (_spec.componentType === "hook") {
      return ".claude";
    }
    return ".claude/skills";
  }

  protected override mapComponentType(): "skill" {
    return "skill";
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
        // Quote strings with special characters
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

  private renderHooks(
    spec: ComponentSpec,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    const startTime = Date.now();
    const losses: ConversionLoss[] = [];
    const warnings: ConversionWarning[] = [];
    const preservedSemantics: string[] = [];
    const suggestions: string[] = [];

    const settings = cloneRawConfig(spec.metadata) ?? {};
    const hooksRecord: Record<string, Array<Record<string, unknown>>> = {};

    for (const hook of spec.hooks ?? []) {
      const event = this.mapHookEventToClaude(hook.event);
      if (!event) {
        losses.push({
          category: "configuration",
          severity: "warning",
          description: `Hook event "${hook.event}" cannot be represented in Claude settings.json`,
          sourceField: `hooks.${hook.event}`,
        });
        continue;
      }

      if (!hooksRecord[event]) {
        hooksRecord[event] = [];
      }

      hooksRecord[event]!.push({
        matcher: hook.matcher ?? this.defaultClaudeMatcher(hook.event),
        hooks: [
          {
            type: "command",
            command: hook.command,
            ...(hook.timeout ? { timeout: hook.timeout } : {}),
          },
        ],
      });
    }

    settings.hooks = hooksRecord;
    preservedSemantics.push("Hook commands");
    preservedSemantics.push("Lifecycle event bindings");

    const report: ConversionReport = {
      ...this.createConversionReport(spec, "claude", startTime),
      preservedSemantics,
      losses,
      warnings,
      suggestions,
      fidelityScore: this.calculateFidelity(losses, warnings),
    };

    return this.createSuccessResult(
      `${JSON.stringify(settings, null, 2)}\n`,
      this.getTargetFilename(spec),
      report,
    );
  }

  private mapHookEventToClaude(event: string): string | undefined {
    switch (event) {
      case "pre_read_code":
      case "pre_write_code":
      case "pre_run_command":
      case "pre_mcp_tool_use":
        return "PreToolUse";
      case "post_read_code":
      case "post_write_code":
      case "post_run_command":
      case "post_mcp_tool_use":
        return "PostToolUse";
      case "pre_user_prompt":
        return "UserPromptSubmit";
      case "post_cascade_response":
        return "Stop";
      case "post_setup_worktree":
        return "Setup";
      default:
        return event;
    }
  }

  private defaultClaudeMatcher(event: string): string | undefined {
    switch (event) {
      case "pre_read_code":
      case "post_read_code":
        return "Read|Glob|Grep";
      case "pre_write_code":
      case "post_write_code":
        return "Edit|Write|MultiEdit";
      case "pre_run_command":
      case "post_run_command":
        return "Bash";
      case "pre_mcp_tool_use":
      case "post_mcp_tool_use":
        return "mcp__";
      default:
        return undefined;
    }
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
}
