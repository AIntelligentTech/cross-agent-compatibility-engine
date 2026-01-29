/**
 * Validator for Google Gemini CLI skills and commands
 */

import type { AgentId, ComponentType } from "../../core/types.js";
import type { ValidationIssue, ValidationResult, ValidatorOptions } from "../validator-framework.js";
import matter from "gray-matter";
import { BaseValidator } from "../validator-framework.js";

interface GeminiFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  code_execution?: boolean;
  google_search?: boolean;
  include_directories?: string[];
  instruction?: string;
  slash_command?: string;
  examples?: string[];
  globs?: string | string[];
}

export class GeminiValidator extends BaseValidator {
  readonly agentId: AgentId = "gemini";
  readonly supportedVersions = ["1.0.0", "1.1.0"];
  readonly componentTypes: ComponentType[] = ["skill", "command", "memory"];

  validate(
    content: string,
    componentType: ComponentType,
    options?: ValidatorOptions
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const info: ValidationIssue[] = [];

    try {
      const parsed = matter(content);
      const fm = parsed.data as GeminiFrontmatter;
      const body = parsed.content.trim();

      const detectedType = componentType || this.detectComponentType(fm, body);
      const version = options?.version || "1.0.0";

      switch (detectedType) {
        case "skill":
          this.validateSkill(fm, body, version, issues, warnings, info, options);
          break;
        case "command":
          this.validateCommand(fm, body, version, issues, warnings, info, options);
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
              "type"
            )
          );
      }

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

  private detectComponentType(fm: GeminiFrontmatter, body: string): string {
    if (fm.slash_command) return "command";
    if (body.length < 500 && !fm.instruction && !fm.examples) return "memory";
    return "skill";
  }

  private validateSkill(
    fm: GeminiFrontmatter,
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
          "Skill should have a 'description' field",
          "warning",
          "description"
        )
      );
    }

    if (body.length < 100) {
      warnings.push(
        this.createIssue(
          "SHORT_BODY",
          "Skill body is very short",
          "warning",
          "body",
          "Add more detailed instructions"
        )
      );
    }

    if (fm.temperature !== undefined) {
      if (fm.temperature < 0 || fm.temperature > 2) {
        issues.push(
          this.createIssue(
            "INVALID_TEMPERATURE",
            `Temperature ${fm.temperature} is out of valid range (0.0-2.0)`,
            "error",
            "temperature"
          )
        );
      }
    }

    if (fm.model) {
      const validModels = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"];
      if (!validModels.some(m => fm.model?.includes(m))) {
        warnings.push(
          this.createIssue(
            "UNKNOWN_MODEL",
            `Model "${fm.model}" may not be supported`,
            "warning",
            "model",
            `Valid models: ${validModels.join(", ")}`
          )
        );
      }
    }
  }

  private validateCommand(
    fm: GeminiFrontmatter,
    _body: string,
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
          "Command must have a 'name' field",
          "error",
          "name"
        )
      );
    }

    if (!fm.slash_command) {
      warnings.push(
        this.createIssue(
          "MISSING_SLASH_COMMAND",
          "Command should have a slash_command",
          "warning",
          "slash_command"
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

  private validateMemory(
    fm: GeminiFrontmatter,
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
    fm: GeminiFrontmatter,
    _body: string,
    _version: string,
    _issues: ValidationIssue[],
    warnings: ValidationIssue[],
    info: ValidationIssue[]
  ): void {
    if (fm.tools && fm.tools.length > 0) {
      const validTools = ["code_execution", "google_search", "file_read", "file_write"];
      fm.tools.forEach(tool => {
        if (!validTools.includes(tool)) {
          warnings.push(
            this.createIssue(
              "UNKNOWN_TOOL",
              `Tool "${tool}" may not be available`,
              "warning",
              "tools"
            )
          );
        }
      });
    }

    if (fm.include_directories) {
      info.push(
        this.createIssue(
          "MULTI_DIRECTORY",
          `Skill uses ${fm.include_directories.length} additional directorie(s)`,
          "info",
          "include_directories"
        )
      );
    }

    if (fm.code_execution) {
      info.push(
        this.createIssue(
          "CODE_EXECUTION",
          "Code execution enabled",
          "info",
          "code_execution"
        )
      );
    }

    if (fm.google_search) {
      info.push(
        this.createIssue(
          "GOOGLE_SEARCH",
          "Google search enabled",
          "info",
          "google_search"
        )
      );
    }

    if (fm.max_tokens !== undefined) {
      if (fm.max_tokens < 1 || fm.max_tokens > 8192) {
        warnings.push(
          this.createIssue(
            "MAX_TOKENS_RANGE",
            `max_tokens ${fm.max_tokens} is unusual (typical range: 256-8192)`,
            "warning",
            "max_tokens"
          )
        );
      }
    }
  }
}
