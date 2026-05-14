/**
 * Parser for Windsurf (Cascade) workflows
 *
 * Windsurf workflows use YAML frontmatter with:
 * - description: short summary
 * - auto_execution_mode: numeric activation setting (optional)
 */

import matter from "gray-matter";
import type {
  ComponentSpec,
  CapabilitySet,
  HookSpec,
  RuleActivation,
  SemanticVersion,
} from "../core/types.js";
import { createDefaultCapabilities, parseVersion } from "../core/types.js";
import { createMetadata } from "../core/component-preservation.js";
import { BaseParser, type ParserOptions } from "./parser-interface.js";
import type { VersionDetectionResult } from "../versioning/types.js";
import { detectWindsurfVersion } from "../versioning/version-detector.js";
import { parseWindsurfHooks } from "./windsurf-hooks-parser.js";

interface WindsurfFrontmatter {
  name?: string;
  description?: string;
  auto_execution_mode?: number | string;
  version?: string;
  tags?: string[];
  trigger?: string;
  globs?: string | string[];
  alwaysApply?: boolean;
}

const WINDSURF_FRONTMATTER_KEYS = [
  "name",
  "description",
  "auto_execution_mode",
  "version",
  "tags",
  "trigger",
  "globs",
  "alwaysApply",
] as const;

export class WindsurfParser extends BaseParser {
  readonly agentId = "windsurf" as const;

  canParse(content: string, filename?: string): boolean {
    if (filename) {
      if (filename.endsWith(".windsurf/hooks.json")) {
        return true;
      }
      if (
        filename.includes(".windsurf/workflows/") ||
        filename.includes(".windsurf/rules/") ||
        filename.includes(".windsurf/skills/")
      ) {
        return true;
      }
    }

    // Check for Windsurf-specific patterns
    try {
      const parsed = matter(content);
      const fm = parsed.data as WindsurfFrontmatter;
      const body = parsed.content.trim();
      const hasRuleMarkers =
        fm.trigger !== undefined ||
        fm.alwaysApply !== undefined ||
        fm.globs !== undefined;
      const hasSkillMarkers = Array.isArray(fm.tags) && fm.tags.length > 0;
      const hasLegacyWorkflowMarker = fm.auto_execution_mode !== undefined;
      const hasWorkflowShape =
        typeof fm.description === "string" &&
        fm.name === undefined &&
        (/^\d+\./m.test(body) ||
          /call \/[\w-]+/i.test(body) ||
          /^#\s+workflow\b/im.test(body));

      return (
        hasRuleMarkers ||
        hasSkillMarkers ||
        hasLegacyWorkflowMarker ||
        hasWorkflowShape
      );
    } catch {
      return false;
    }
  }

  /**
   * Detect Windsurf version from content and file path
   */
  override detectVersion(
    content: string,
    filePath?: string,
  ): VersionDetectionResult {
    return detectWindsurfVersion(content, filePath);
  }

  parse(
    content: string,
    options?: ParserOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    const warnings: string[] = [];

    if (options?.sourceFile?.endsWith(".windsurf/hooks.json")) {
      return this.parseHooksConfig(content, options);
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(content);
    } catch (err) {
      return this.createErrorResult([
        `Failed to parse frontmatter: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    }

    const fm = parsed.data as WindsurfFrontmatter;
    const body = parsed.content.trim();

    // Extract ID from filename or body title
    const id =
      fm.name ??
      this.extractIdFromFilename(options?.sourceFile) ??
      this.extractIdFromBody(body) ??
      "unknown-workflow";

    const componentType = this.detectComponentType(options?.sourceFile);

    // Parse version
    const version: SemanticVersion = fm.version
      ? parseVersion(fm.version)
      : { major: 1, minor: 0, patch: 0 };

    // Map agent activation mode
    const activationMode = this.resolveActivationMode(componentType, fm);

    // Infer capabilities from body content
    const capabilities =
      options?.inferCapabilities !== false
        ? this.inferCapabilities(body)
        : createDefaultCapabilities();

    // Build the ComponentSpec
    const spec: ComponentSpec = {
      id,
      version,
      sourceAgent: {
        id: "windsurf",
        detectedAt: new Date().toISOString(),
      },
      componentType,
      category: fm.tags ?? this.inferCategory(fm.description, body),
      intent: {
        summary: fm.description ?? `Windsurf ${componentType}: ${id}`,
        purpose: fm.description ?? "No description provided",
        whenToUse: fm.description,
      },
      activation: {
        mode: activationMode,
        safetyLevel: this.inferSafetyLevel(body, capabilities),
        requiresConfirmation: activationMode === "manual",
      },
      invocation: {
        slashCommand: id,
        userInvocable: true,
      },
      execution: {
        context: "main",
      },
      body,
      capabilities,
      metadata: createMetadata(
        {
          sourceFile: options?.sourceFile,
          originalFormat: `windsurf-${componentType}`,
          rawFrontmatter: fm as Record<string, unknown>,
          knownKeys: WINDSURF_FRONTMATTER_KEYS,
        },
        {
          tags: fm.tags,
        },
      ),
    };

    if (componentType === "rule") {
      spec.ruleActivation = this.createRuleActivation(fm);
    }

    // Add warnings for Windsurf-specific features
    if (componentType === "workflow" && fm.auto_execution_mode !== undefined) {
      warnings.push(
        "Legacy auto_execution_mode detected. Windsurf workflows are treated as manual-only.",
      );
    } else if (
      fm.auto_execution_mode !== undefined &&
      fm.auto_execution_mode !== 0 &&
      fm.auto_execution_mode !== "manual"
    ) {
      warnings.push(
        `auto_execution_mode=${fm.auto_execution_mode} may not have direct equivalents in other agents`,
      );
    }

    return this.createSuccessResult(spec, warnings);
  }

  private parseHooksConfig(
    content: string,
    options?: ParserOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    const parsed = parseWindsurfHooks(content);

    if (!parsed.success || !parsed.spec) {
      return this.createErrorResult(parsed.errors);
    }

    const hooks: HookSpec[] = Object.entries(parsed.spec.hooks).flatMap(
      ([event, hookEntries]) =>
        hookEntries.map((hook) => ({
          event: event as HookSpec["event"],
          command: hook.command,
          workingDirectory: hook.working_directory,
        })),
    );

    const capabilities = createDefaultCapabilities();
    capabilities.needsShell = hooks.length > 0;
    capabilities.providesAnalysis = true;

    const spec: ComponentSpec = {
      id: "windsurf-hooks",
      version: { major: 1, minor: 0, patch: 0 },
      sourceAgent: {
        id: "windsurf",
        detectedAt: new Date().toISOString(),
      },
      componentType: "hook",
      category: ["automation", "hooks"],
      intent: {
        summary: "Windsurf Cascade hooks configuration",
        purpose: "Configure lifecycle hooks for Windsurf Cascade",
      },
      activation: {
        mode: "hooked",
        safetyLevel: "dangerous",
      },
      invocation: {
        userInvocable: false,
      },
      execution: {
        context: "main",
      },
      body: content,
      capabilities,
      hooks,
      metadata: createMetadata({
        sourceFile: options?.sourceFile,
        originalFormat: "windsurf-hooks",
        rawConfig: { hooks: parsed.spec.hooks } as Record<string, unknown>,
        knownKeys: ["hooks"],
      }),
    };

    return this.createSuccessResult(spec, parsed.warnings);
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) return undefined;

    // Extract from .windsurf/workflows/<name>.md
    const workflowMatch = filename.match(/\.windsurf\/workflows\/([^/]+)\.md$/);
    if (workflowMatch?.[1]) return workflowMatch[1];

    const skillMatch = filename.match(/\.windsurf\/skills\/([^/]+)\/SKILL\.md$/);
    if (skillMatch?.[1]) return skillMatch[1];

    // Extract from .windsurf/rules/<name>.md
    const ruleMatch = filename.match(/\.windsurf\/rules\/([^/]+)\.md$/);
    if (ruleMatch?.[1]) return ruleMatch[1];

    return undefined;
  }

  private extractIdFromBody(body: string): string | undefined {
    // Extract from H1 title: # Title
    const titleMatch = body.match(/^#\s+(.+)$/m);
    if (titleMatch?.[1]) {
      // Convert title to slug: "Test Workflow" -> "test-workflow"
      return titleMatch[1]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    return undefined;
  }

  private detectComponentType(
    filename?: string,
  ): "skill" | "workflow" | "rule" {
    if (filename?.includes("/rules/")) {
      return "rule";
    }

    if (filename?.includes("/skills/") || filename?.endsWith("/SKILL.md")) {
      return "skill";
    }

    return "workflow";
  }

  private createRuleActivation(fm: WindsurfFrontmatter): RuleActivation {
    const normalizedGlobs = Array.isArray(fm.globs)
      ? fm.globs
      : typeof fm.globs === "string"
        ? fm.globs
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : undefined;

    return {
      globs: normalizedGlobs,
      alwaysApply:
        fm.alwaysApply === true ||
        fm.trigger === "always_on" ||
        (!normalizedGlobs || normalizedGlobs.length === 0),
      agentDecided: fm.trigger === "model_decision",
      scope: "project",
    };
  }

  private resolveActivationMode(
    componentType: "skill" | "workflow" | "rule",
    fm: WindsurfFrontmatter,
  ): "manual" | "suggested" | "auto" | "contextual" {
    if (componentType === "workflow") {
      return "manual";
    }

    if (componentType === "skill") {
      return "suggested";
    }

    if (fm.trigger === "manual") {
      return "manual";
    }

    if (fm.trigger === "glob" || fm.globs !== undefined) {
      return "contextual";
    }

    if (fm.trigger === "always_on" || fm.alwaysApply === true) {
      return "auto";
    }

    return "suggested";
  }

  private inferCapabilities(body: string): CapabilitySet {
    const caps = createDefaultCapabilities();
    const lowerBody = body.toLowerCase();

    // Infer from body content and tool references
    caps.needsShell =
      lowerBody.includes("run_command") ||
      lowerBody.includes("terminal") ||
      lowerBody.includes("shell");
    caps.needsGit =
      lowerBody.includes("git") ||
      lowerBody.includes("commit") ||
      lowerBody.includes("branch");
    caps.needsNetwork =
      lowerBody.includes("http") ||
      lowerBody.includes("api") ||
      lowerBody.includes("fetch") ||
      lowerBody.includes("read_url");
    caps.needsBrowser =
      lowerBody.includes("browser") || lowerBody.includes("browser_preview");
    caps.needsCodeSearch =
      lowerBody.includes("code_search") ||
      lowerBody.includes("grep_search") ||
      lowerBody.includes("find_by_name");
    caps.needsFilesystem =
      lowerBody.includes("read_file") ||
      lowerBody.includes("write_to_file") ||
      lowerBody.includes("edit") ||
      lowerBody.includes("list_dir");

    // Infer what it provides
    caps.providesAnalysis =
      lowerBody.includes("analyz") ||
      lowerBody.includes("review") ||
      lowerBody.includes("audit") ||
      lowerBody.includes("investigate");
    caps.providesCodeGeneration =
      lowerBody.includes("implement") ||
      lowerBody.includes("create") ||
      lowerBody.includes("generate") ||
      lowerBody.includes("code");
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
    if (text.includes("iterate")) categories.push("iteration");
    if (text.includes("think") || text.includes("reason"))
      categories.push("reasoning");

    return categories.length > 0 ? categories : ["general"];
  }

  private inferSafetyLevel(
    body: string,
    capabilities: CapabilitySet,
  ): "safe" | "sensitive" | "dangerous" {
    const lowerBody = body.toLowerCase();

    if (
      lowerBody.includes("delete") ||
      lowerBody.includes("remove") ||
      lowerBody.includes("drop") ||
      capabilities.needsShell
    ) {
      return "dangerous";
    }

    if (
      capabilities.needsNetwork ||
      capabilities.needsGit ||
      lowerBody.includes("modify") ||
      lowerBody.includes("edit")
    ) {
      return "sensitive";
    }

    return "safe";
  }
}
