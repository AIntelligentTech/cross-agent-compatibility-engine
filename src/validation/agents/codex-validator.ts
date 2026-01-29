/**
 * Validator for OpenAI Codex skills and commands
 */

import type { AgentId, ComponentType } from "../../core/types.js";
import type { ValidationIssue, ValidationResult, ValidatorOptions } from "../validator-framework.js";
import matter from "gray-matter";
import { BaseValidator } from "../validator-framework.js";

interface CodexFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  model?: string;
  approval_policy?: string;
  sandbox_mode?: string;
  web_search?: string;
  mcp_servers?: Record<string, unknown>;
  tools?: string[];
  features?: Record<string, boolean>;
  prompt?: string;
  instruction?: string;
  slash_command?: string;
  argument_hint?: string;
  globs?: string | string[];
  alwaysApply?: boolean;
}

export class CodexValidator extends BaseValidator {
  readonly agentId: AgentId = "codex";
  readonly supportedVersions = ["1.0.0", "1.1.0"];
  readonly componentTypes: ComponentType[] = ["skill", "command", "rule", "memory"];

  validate(
    content: string,
    componentType: ComponentType,
    options?: ValidatorOptions
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    try {
      // Parse frontmatter
      const parsed = matter(content);
      const fm = parsed.data as CodexFrontmatter;
      const body = parsed.content.trim();

      // Determine component type if not specified
      const detectedType = componentType || this.detectComponentType(fm, body);

      const version = options?.version || "1.0.0";

      // Validate based on component type
      switch (detectedType) {
        case "skill":
          this.validateSkill(fm, body, version, issues, warnings, info, options);
          break;
        case "command":
          this.validateCommand(fm, body, version, issues, warnings, info, options);
          break;
        case "rule":
          this.validateRule(fm, body, version, issues, warnings, info, options);
          break;
        case "memory":
          this.validateMemory(fm, body, version, issues, warnings, info, options);
          break;
        default:
          warnings.push(
            this.createIssue(
              "UNKNOWN_TYPE",
              `Unknown component type: ${detectedType}`,
              "warning",
              "type",
              "Use skill, command, rule, or memory"
            )
          );
      }

      // Common validations
      this.validateCommon(fm, body, version, issues, warnings, info);

      const valid = options?.strict
        ? issues.length === 0 && warnings.length === 0
        : issues.length === 0;

      return {
        valid,
        agent: this.agentId,
        componentType: detectedType as ComponentType,
        version,
        issues,
        warnings,
        info,
      };
    } catch (err) {
      return {
        valid: false,
        agent: this.agentId,
        componentType: componentType || "unknown" as ComponentType,
        version: options?.version || "1.0.0",
        issues: [
          {
            code: "PARSE_ERROR",
            message: err instanceof Error ? err.message : "Failed to parse content",
            severity: "error",
          },
        ],
        warnings: [],
        info: [],
      };
    }
  }

  private detectComponentType(fm: CodexFrontmatter, body: string): string {
    if (fm.slash_command || fm.argument_hint) return "command";
    if (fm.globs || fm.alwaysApply !== undefined) return "rule";
    if (body.length < 500 && !fm.prompt && !fm.instruction) return "memory";
    return "skill";
  }

  private validateSkill(
    fm: CodexFrontmatter,
    body: string,
    _version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    _info: ValidationIssue[],
    _options?: ValidatorOptions
  ): void {
    // Required fields
    if (!fm.name) {
      issues.push(
        this.createIssue(
          "MISSING_NAME",
          "Skill must have a 'name' field in frontmatter",
          "error",
          "name",
          "Add 'name: your-skill-name' to frontmatter"
        )
      );
    }

    if (!fm.description) {
      warnings.push(
        this.createIssue(
          "MISSING_DESCRIPTION",
          "Skill should have a 'description' field for better discoverability",
          "warning",
          "description",
          "Add 'description: Brief description of skill purpose'"
        )
      );
    }

    // Body length check
    if (body.length < 100) {
      warnings.push(
        this.createIssue(
          "SHORT_BODY",
          "Skill body is very short, may not provide enough context",
          "warning",
          "body",
          "Add more detailed instructions to the body"
        )
      );
    }

    // Validate model if specified
    if (fm.model) {
      const validModels = ["gpt-5-codex", "gpt-5.1-codex", "o4-mini", "o3"];
      if (!validModels.some(m => fm.model?.includes(m))) {
        warnings.push(
          this.createIssue(
            "UNKNOWN_MODEL",
            `Model "${fm.model}" may not be supported by Codex`,
            "warning",
            "model",
            `Valid models: ${validModels.join(", ")}`
          )
        );
      }
    }

    // Validate approval policy
    if (fm.approval_policy) {
      const validPolicies = ["untrusted", "on-failure", "on-request", "never"];
      if (!validPolicies.includes(fm.approval_policy)) {
        issues.push(
          this.createIssue(
            "INVALID_APPROVAL_POLICY",
            `Invalid approval_policy: ${fm.approval_policy}`,
            "error",
            "approval_policy",
            `Valid values: ${validPolicies.join(", ")}`
          )
        );
      }
    }

    // Validate sandbox mode
    if (fm.sandbox_mode) {
      const validModes = ["read-only", "workspace-write", "danger-full-access"];
      if (!validModes.includes(fm.sandbox_mode)) {
        issues.push(
          this.createIssue(
            "INVALID_SANDBOX_MODE",
            `Invalid sandbox_mode: ${fm.sandbox_mode}`,
            "error",
            "sandbox_mode",
            `Valid values: ${validModes.join(", ")}`
          )
        );
      }
    }
  }

  private validateCommand(
    fm: CodexFrontmatter,
    _body: string,
    _version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    _info: ValidationIssue[],
    _options?: ValidatorOptions
  ): void {
    // Commands need a name
    if (!fm.name) {
      issues.push(
        this.createIssue(
          "MISSING_NAME",
          "Command must have a 'name' field",
          "error",
          "name"
        )
      );
    }

    // Slash command validation
    if (fm.slash_command) {
      if (!fm.slash_command.startsWith("/")) {
        warnings.push(
          this.createIssue(
            "SLASH_COMMAND_FORMAT",
            "Slash command should start with /",
            "warning",
            "slash_command",
            "Use format: /command-name"
          )
        );
      }
    } else {
      warnings.push(
        this.createIssue(
          "MISSING_SLASH_COMMAND",
          "Command should have a slash_command for easy invocation",
          "warning",
          "slash_command",
          "Add 'slash_command: /my-command'"
        )
      );
    }

    if (!fm.description) {
      warnings.push(
        this.createIssue(
          "MISSING_DESCRIPTION",
          "Command should have a description",
          "warning",
          "description"
        )
      );
    }
  }

  private validateRule(
    fm: CodexFrontmatter,
    body: string,
    _version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    _info: ValidationIssue[],
    _options?: ValidatorOptions
  ): void {
    if (!fm.name) {
      issues.push(
        this.createIssue(
          "MISSING_NAME",
          "Rule must have a 'name' field",
          "error",
          "name"
        )
      );
    }

    // Rules should have globs or alwaysApply
    if (!fm.globs && fm.alwaysApply === undefined) {
      warnings.push(
        this.createIssue(
          "MISSING_ACTIVATION",
          "Rule should have globs or alwaysApply for activation",
          "warning",
          "globs",
          "Add 'globs: \"src/**/*.js\"' or 'alwaysApply: true'"
        )
      );
    }

    // Validate globs format
    if (fm.globs) {
      const globs = Array.isArray(fm.globs) ? fm.globs : [fm.globs];
      globs.forEach(glob => {
        if (glob.includes(" ") && !glob.startsWith("{") && !glob.startsWith("[")) {
          warnings.push(
            this.createIssue(
              "GLOB_FORMAT",
              `Glob pattern "${glob}" contains spaces, may not work as expected`,
              "warning",
              "globs",
              "Use brace expansion: {pattern1,pattern2}"
            )
          );
        }
      });
    }

    // Rules should have clear instructions
    if (body.length < 50) {
      warnings.push(
        this.createIssue(
          "SHORT_RULE",
          "Rule body is very short, may be unclear",
          "warning",
          "body"
        )
      );
    }
  }

  private validateMemory(
    fm: CodexFrontmatter,
    _body: string,
    _version: string,
    issues: ValidationIssue[],
    _warnings: ValidationIssue[],
    _info: ValidationIssue[],
    _options?: ValidatorOptions
  ): void {
    if (!fm.name) {
      issues.push(
        this.createIssue(
          "MISSING_NAME",
          "Memory must have a 'name' field",
          "error",
          "name"
        )
      );
    }
  }

  private validateCommon(
    fm: CodexFrontmatter,
    _body: string,
    _version: string,
    issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): void {
    // MCP server validation
    if (fm.mcp_servers) {
      for (const [name, config] of Object.entries(fm.mcp_servers)) {
        if (typeof config === "object" && config !== null) {
          const cfg = config as Record<string, unknown>;
          if (!cfg.command && !cfg.url) {
            issues.push(
              this.createIssue(
                "MCP_MISSING_COMMAND",
                `MCP server "${name}" missing command or url`,
                "error",
                `mcp_servers.${name}`,
                "Add 'command' for stdio or 'url' for HTTP server"
              )
            );
          }
        }
      }
      info.push(
        this.createIssue(
          "MCP_SERVERS",
          `Configured ${Object.keys(fm.mcp_servers).length} MCP server(s)`,
          "info",
          "mcp_servers"
        )
      );
    }

    // Tools validation
    if (fm.tools && fm.tools.length > 0) {
      const validTools = ["web_search", "file_read", "file_write", "shell", "code_interpreter"];
      fm.tools.forEach(tool => {
        if (!validTools.includes(tool)) {
          warnings.push(
            this.createIssue(
              "UNKNOWN_TOOL",
              `Tool "${tool}" may not be available in Codex`,
              "warning",
              "tools",
              `Valid tools: ${validTools.join(", ")}`
            )
          );
        }
      });
    }

    // Web search validation
    if (fm.web_search) {
      const validModes = ["disabled", "cached", "live"];
      if (!validModes.includes(fm.web_search)) {
        issues.push(
          this.createIssue(
            "INVALID_WEB_SEARCH",
            `Invalid web_search: ${fm.web_search}`,
            "error",
            "web_search",
            `Valid values: ${validModes.join(", ")}`
          )
        );
      }
    }

    // Features validation
    if (fm.features) {
      const experimentalFeatures = Object.entries(fm.features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      if (experimentalFeatures.length > 0) {
        info.push(
          this.createIssue(
            "EXPERIMENTAL_FEATURES",
            `Enabled experimental features: ${experimentalFeatures.join(", ")}`,
            "info",
            "features"
          )
        );
      }
    }
  }

}
