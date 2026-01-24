/**
 * Parser for Cursor commands
 *
 * Cursor commands are plain Markdown files with no required frontmatter.
 * Convention uses # Title, ## Objective, ## Requirements, ## Output sections.
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
import { detectCursorVersion } from "../versioning/version-detector.js";

interface CursorFrontmatter {
  title?: string;
  description?: string;
  version?: string;
  tags?: string[];
}

export class CursorParser extends BaseParser {
  readonly agentId = "cursor" as const;

  canParse(content: string, filename?: string): boolean {
    if (filename) {
      if (filename.includes(".cursor/commands/")) {
        return true;
      }
    }

    // Cursor commands are plain markdown, so we check for typical structure
    // Look for # Title at the start or ## Objective section
    const hasTitle = /^#\s+.+/m.test(content);
    const hasObjective = /^##\s+Objective/im.test(content);
    const hasRequirements = /^##\s+Requirements/im.test(content);

    return hasTitle && (hasObjective || hasRequirements);
  }

  /**
   * Detect Cursor version from content and file path
   */
  override detectVersion(
    content: string,
    filePath?: string,
  ): VersionDetectionResult {
    return detectCursorVersion(content, filePath);
  }

  parse(
    content: string,
    options?: ParserOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
    const warnings: string[] = [];

    // Try to parse frontmatter (optional for Cursor)
    let fm: CursorFrontmatter = {};
    let body = content;

    try {
      const parsed = matter(content);
      if (Object.keys(parsed.data).length > 0) {
        fm = parsed.data as CursorFrontmatter;
        body = parsed.content.trim();
      }
    } catch {
      // No frontmatter, use full content as body
      body = content.trim();
    }

    // Extract title from first # heading if not in frontmatter
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = fm.title ?? titleMatch?.[1] ?? "Unknown Command";

    // Extract ID from filename or title
    const id =
      this.extractIdFromFilename(options?.sourceFile) ?? this.slugify(title);

    // Parse version
    const version: SemanticVersion = fm.version
      ? parseVersion(fm.version)
      : { major: 1, minor: 0, patch: 0 };

    // Extract description from ## Objective section or frontmatter
    const description =
      fm.description ?? this.extractSection(body, "Objective") ?? title;

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
        id: "cursor",
        detectedAt: new Date().toISOString(),
      },
      componentType: "command",
      category: fm.tags ?? this.inferCategory(description, body),
      intent: {
        summary: description,
        purpose: description,
        whenToUse: this.extractSection(body, "When to Use") ?? description,
      },
      activation: {
        mode: "manual", // Cursor commands are always manual
        safetyLevel: this.inferSafetyLevel(body, capabilities),
        requiresConfirmation: true,
      },
      invocation: {
        slashCommand: id,
        userInvocable: true,
        // Cursor doesn't have structured arguments
      },
      execution: {
        context: "main",
      },
      body,
      capabilities,
      metadata: {
        sourceFile: options?.sourceFile,
        originalFormat: "cursor-command",
        updatedAt: new Date().toISOString(),
        tags: fm.tags,
      },
    };

    // Add warnings about Cursor limitations
    warnings.push(
      "Cursor commands have no structured argument system - arguments are free-form",
    );

    return this.createSuccessResult(spec, warnings);
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) return undefined;

    // Extract from .cursor/commands/<name>.md
    const match = filename.match(/\.cursor\/commands\/([^/]+)\.md$/);
    if (match?.[1]) return match[1];

    return undefined;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private extractSection(
    body: string,
    sectionName: string,
  ): string | undefined {
    const regex = new RegExp(
      `^##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=^##|$)`,
      "mi",
    );
    const match = body.match(regex);
    return match?.[1]?.trim();
  }

  private inferCapabilities(body: string): CapabilitySet {
    const caps = createDefaultCapabilities();
    const lowerBody = body.toLowerCase();

    caps.needsShell =
      lowerBody.includes("terminal") ||
      lowerBody.includes("command") ||
      lowerBody.includes("shell") ||
      lowerBody.includes("run");
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
    caps.needsFilesystem = true; // Most commands need filesystem access

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
