/**
 * Parser for Claude Code skills
 *
 * Claude skills use YAML frontmatter with specific fields:
 * - name, description, argument-hint
 * - disable-model-invocation, user-invocable
 * - allowed-tools, model, context, agent
 */

import matter from "gray-matter";
import type {
  ComponentSpec,
  CapabilitySet,
  SemanticVersion,
} from "../core/types.js";
import { createDefaultCapabilities, parseVersion } from "../core/types.js";
import { BaseParser, type ParserOptions } from "./parser-interface.js";
import type { VersionDetectionResult } from "../versioning/types.js";
import { detectClaudeVersion } from "../versioning/version-detector.js";

interface ClaudeFrontmatter {
  name?: string;
  description?: string;
  "argument-hint"?: string;
  "disable-model-invocation"?: boolean;
  "user-invocable"?: boolean;
  "allowed-tools"?: string[];
  model?: string;
  context?: string;
  agent?: string;
  version?: string;
}

export class ClaudeParser extends BaseParser {
  readonly agentId = "claude" as const;

  canParse(content: string, filename?: string): boolean {
    if (filename) {
      if (
        filename.includes(".claude/skills/") ||
        filename.includes(".claude/commands/")
      ) {
        return true;
      }
    }

    // Check for Claude-specific frontmatter fields
    try {
      const { data } = matter(content);
      const fm = data as ClaudeFrontmatter;
      return (
        fm.name !== undefined ||
        fm["disable-model-invocation"] !== undefined ||
        fm["user-invocable"] !== undefined ||
        fm["allowed-tools"] !== undefined
      );
    } catch {
      return false;
    }
  }

  /**
   * Detect Claude Code version from content and file path
   */
  override detectVersion(
    content: string,
    filePath?: string,
  ): VersionDetectionResult {
    return detectClaudeVersion(content, filePath);
  }

  parse(
    content: string,
    options?: ParserOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    const warnings: string[] = [];

    // Validate content is not empty
    if (!content || content.trim().length === 0) {
      return this.createErrorResult([
        "Content is empty. Please provide valid component content.",
      ]);
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(content);
    } catch (err) {
      return this.createErrorResult([
        `Failed to parse frontmatter: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    }

    const fm = parsed.data as ClaudeFrontmatter;
    const body = parsed.content.trim();

    // Extract ID from name or filename
    const id =
      fm.name ??
      this.extractIdFromFilename(options?.sourceFile) ??
      "unknown-skill";

    // Parse version
    const version: SemanticVersion = fm.version
      ? parseVersion(fm.version)
      : { major: 1, minor: 0, patch: 0 };

    // Infer capabilities from body content
    const capabilities =
      options?.inferCapabilities !== false
        ? this.inferCapabilities(body, fm["allowed-tools"])
        : createDefaultCapabilities();

    // Build the ComponentSpec
    const spec: ComponentSpec = {
      id,
      version,
      sourceAgent: {
        id: "claude",
        detectedAt: new Date().toISOString(),
      },
      componentType: "skill",
      category: this.inferCategory(fm.description, body),
      intent: {
        summary: fm.description ?? `Claude skill: ${id}`,
        purpose: fm.description ?? "No description provided",
        whenToUse: fm.description,
      },
      activation: {
        mode: fm["disable-model-invocation"] ? "manual" : "suggested",
        safetyLevel: this.inferSafetyLevel(body, capabilities),
        requiresConfirmation: fm["disable-model-invocation"],
      },
      invocation: {
        slashCommand: id,
        argumentHint: fm["argument-hint"],
        userInvocable: fm["user-invocable"] !== false,
      },
      execution: {
        context: this.mapContext(fm.context),
        allowedTools: fm["allowed-tools"],
        preferredModel: fm.model,
        subAgent: fm.agent,
      },
      body,
      capabilities,
      metadata: {
        sourceFile: options?.sourceFile,
        originalFormat: "claude-skill",
        updatedAt: new Date().toISOString(),
      },
    };

    // Add warnings for features that may not convert well
    if (fm.context === "fork") {
      warnings.push(
        'Claude "fork" context has no direct equivalent in other agents',
      );
    }
    if (fm.agent) {
      warnings.push(`Sub-agent "${fm.agent}" is Claude-specific`);
    }

    // Perform validation if requested
    let validation;
    if (options?.validateOnParse) {
      validation = this.validateContent(content, "skill", {
        version: `${version.major}.${version.minor}.${version.patch}`,
        strict: options?.strictValidation,
      });
      
      // Add validation warnings to result
      for (const warning of validation.warnings) {
        warnings.push(`[Validation] ${warning.message}`);
      }
    }

    return this.createSuccessResult(spec, warnings, validation);
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) return undefined;

    // Extract from .claude/skills/<name>/SKILL.md
    const skillMatch = filename.match(/\.claude\/skills\/([^/]+)\/SKILL\.md$/);
    if (skillMatch?.[1]) return skillMatch[1];

    // Extract from .claude/commands/<name>.md
    const cmdMatch = filename.match(/\.claude\/commands\/([^/]+)\.md$/);
    if (cmdMatch?.[1]) return cmdMatch[1];

    return undefined;
  }

  private mapContext(context?: string): "main" | "fork" | "isolated" {
    if (context === "fork") return "fork";
    if (context === "isolated") return "isolated";
    return "main";
  }

  private inferCapabilities(
    body: string,
    allowedTools?: string[],
  ): CapabilitySet {
    const caps = createDefaultCapabilities();
    const lowerBody = body.toLowerCase();

    // Infer from body content
    caps.needsShell =
      lowerBody.includes("terminal") ||
      lowerBody.includes("command") ||
      lowerBody.includes("shell");
    caps.needsGit =
      lowerBody.includes("git") ||
      lowerBody.includes("commit") ||
      lowerBody.includes("branch");
    caps.needsNetwork =
      lowerBody.includes("http") ||
      lowerBody.includes("api") ||
      lowerBody.includes("fetch");
    caps.needsBrowser =
      lowerBody.includes("browser") || lowerBody.includes("screenshot");
    caps.needsCodeSearch =
      lowerBody.includes("search") ||
      lowerBody.includes("find") ||
      lowerBody.includes("grep");

    // Infer from allowed tools
    if (allowedTools) {
      for (const tool of allowedTools) {
        if (tool.includes("bash") || tool.includes("shell"))
          caps.needsShell = true;
        if (tool.includes("git")) caps.needsGit = true;
        if (tool.includes("browser")) caps.needsBrowser = true;
        if (tool.includes("search") || tool.includes("grep"))
          caps.needsCodeSearch = true;
      }
    }

    // Infer what it provides
    caps.providesAnalysis =
      lowerBody.includes("analyz") ||
      lowerBody.includes("review") ||
      lowerBody.includes("audit");
    caps.providesCodeGeneration =
      lowerBody.includes("implement") ||
      lowerBody.includes("create") ||
      lowerBody.includes("generate");
    caps.providesRefactoring =
      lowerBody.includes("refactor") || lowerBody.includes("restructure");
    caps.providesDocumentation =
      lowerBody.includes("document") ||
      lowerBody.includes("readme") ||
      lowerBody.includes("spec");

    return caps;
  }

  private inferCategory(description?: string, body?: string): string[] {
    const categories: string[] = [];
    const text = `${description ?? ""} ${body ?? ""}`.toLowerCase();

    if (text.includes("architect")) categories.push("architecture");
    if (text.includes("design")) categories.push("design");
    if (text.includes("test")) categories.push("testing");
    if (text.includes("debug")) categories.push("debugging");
    if (text.includes("refactor")) categories.push("refactoring");
    if (text.includes("document")) categories.push("documentation");
    if (text.includes("security")) categories.push("security");
    if (text.includes("performance") || text.includes("optimi"))
      categories.push("performance");

    return categories.length > 0 ? categories : ["general"];
  }

  private inferSafetyLevel(
    body: string,
    capabilities: CapabilitySet,
  ): "safe" | "sensitive" | "dangerous" {
    const lowerBody = body.toLowerCase();

    // Dangerous indicators
    if (
      lowerBody.includes("delete") ||
      lowerBody.includes("remove") ||
      lowerBody.includes("drop") ||
      lowerBody.includes("destroy") ||
      capabilities.needsShell
    ) {
      return "dangerous";
    }

    // Sensitive indicators
    if (
      capabilities.needsNetwork ||
      capabilities.needsGit ||
      lowerBody.includes("modify") ||
      lowerBody.includes("update")
    ) {
      return "sensitive";
    }

    return "safe";
  }
}
