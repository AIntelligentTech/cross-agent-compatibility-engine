import matter from "gray-matter";
import type {
  AgentId,
  ArgumentSpec,
  CapabilitySet,
  ComponentSpec,
  ComponentType,
  SemanticVersion,
} from "../core/types.js";
import { createDefaultCapabilities, parseVersion } from "../core/types.js";
import { BaseParser, type ParserOptions } from "./parser-interface.js";

interface OpenCodeFrontmatter {
  name?: string;
  description?: string;
  version?: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
  arguments?: string[];
  mode?: "primary" | "subagent";
  temperature?: number;
  maxSteps?: number;
  tools?: string[];
  permission?: "allow" | "deny" | "ask";
  hidden?: boolean;
}

export class OpenCodeParser extends BaseParser {
  readonly agentId: AgentId = "opencode";

  canParse(content: string, filename?: string): boolean {
    if (filename?.includes(".opencode/")) {
      return true;
    }

    return (
      /(^|\n)subtask:\s*true\b/m.test(content) ||
      /(^|\n)mode:\s*(primary|subagent)\b/m.test(content) ||
      /(^|\n)permission:\s*(allow|deny|ask)\b/m.test(content) ||
      /(^|\n)maxSteps:\s*\d+/m.test(content) ||
      /(^|\n)hidden:\s*(true|false)\b/m.test(content)
    );
  }

  parse(
    content: string,
    options?: ParserOptions,
  ):
    | ReturnType<typeof this.createSuccessResult>
    | ReturnType<typeof this.createErrorResult> {
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

    const fm = parsed.data as OpenCodeFrontmatter;
    const body = parsed.content.trim();
    const componentType = this.detectComponentType(fm, options?.sourceFile);
    const id = fm.name ?? this.extractIdFromFilename(options?.sourceFile) ?? "unnamed";
    const version: SemanticVersion = fm.version
      ? parseVersion(fm.version)
      : { major: 1, minor: 0, patch: 0 };
    const capabilities = this.inferCapabilities(body, fm.tools);
    const argumentsSpec = this.createArguments(fm.arguments);
    const warnings: string[] = [];

    if (fm.maxSteps !== undefined) {
      warnings.push("OpenCode maxSteps is not preserved in the canonical IR");
    }

    if (fm.permission !== undefined) {
      warnings.push("OpenCode permission settings are approximated during conversion");
    }

    if (fm.hidden === true) {
      warnings.push("OpenCode hidden flag is not preserved in the canonical IR");
    }

    const summary =
      fm.description ?? this.extractDescriptionFromBody(body) ?? `OpenCode ${componentType}: ${id}`;

    const spec: ComponentSpec = {
      id,
      version,
      sourceAgent: {
        id: this.agentId,
        detectedAt: new Date().toISOString(),
      },
      componentType,
      intent: {
        summary,
        purpose: body || summary,
        whenToUse: fm.description,
      },
      activation: {
        mode: componentType === "command" ? "manual" : "suggested",
        safetyLevel: this.inferSafetyLevel(fm, capabilities),
        requiresConfirmation: fm.permission === "ask",
      },
      invocation: {
        userInvocable: componentType === "command",
        argumentHint: this.createArgumentHint(fm.arguments),
      },
      execution: {
        context: fm.subtask ? "fork" : "main",
        allowedTools: fm.tools,
        preferredModel: fm.model,
        subAgent: fm.agent,
      },
      body,
      arguments: argumentsSpec,
      capabilities,
      metadata: {
        sourceFile: options?.sourceFile,
        originalFormat: `opencode-${componentType}`,
        updatedAt: new Date().toISOString(),
        model: fm.model,
        tools: fm.tools,
        subtask: fm.subtask,
        mode: fm.mode,
        temperature: fm.temperature,
      },
    };

    let validation;
    if (options?.validateOnParse) {
      validation = this.validateContent(content, componentType, {
        version: `${version.major}.${version.minor}.${version.patch}`,
        strict: options.strictValidation,
      });

      for (const warning of validation.warnings) {
        warnings.push(`[Validation] ${warning.message}`);
      }
    }

    return this.createSuccessResult(spec, warnings, validation);
  }

  private detectComponentType(
    fm: OpenCodeFrontmatter,
    filename?: string,
  ): ComponentType {
    if (filename) {
      if (filename.includes("/skills/") || filename.endsWith("SKILL.md")) {
        return "skill";
      }
      if (filename.includes("/commands/")) {
        return "command";
      }
      if (filename.includes("/agents/")) {
        return "agent";
      }
    }

    if (
      fm.mode !== undefined ||
      fm.temperature !== undefined ||
      fm.maxSteps !== undefined ||
      fm.permission !== undefined ||
      fm.hidden !== undefined
    ) {
      return "agent";
    }

    if (Array.isArray(fm.arguments) && fm.arguments.length > 0) {
      return "command";
    }

    return "skill";
  }

  private extractIdFromFilename(filename?: string): string | undefined {
    if (!filename) {
      return undefined;
    }

    const match = filename.match(
      /\.opencode\/(?:skills|commands|agents)\/([^/]+?)(?:\/SKILL)?\.md$/i,
    );
    if (match?.[1]) {
      return match[1];
    }

    return undefined;
  }

  private inferCapabilities(body: string, tools?: string[]): CapabilitySet {
    const capabilities = createDefaultCapabilities();
    const lowerBody = body.toLowerCase();
    const normalizedTools = (tools ?? []).map((tool) => tool.toLowerCase());

    capabilities.needsShell =
      normalizedTools.some((tool) => tool.includes("bash") || tool.includes("shell")) ||
      lowerBody.includes("terminal") ||
      lowerBody.includes("shell") ||
      lowerBody.includes("command");
    capabilities.needsBrowser =
      normalizedTools.some((tool) => tool.includes("browser")) ||
      lowerBody.includes("browser") ||
      lowerBody.includes("screenshot");
    capabilities.needsNetwork =
      normalizedTools.some((tool) => tool.includes("fetch") || tool.includes("http")) ||
      lowerBody.includes("http") ||
      lowerBody.includes("api");
    capabilities.needsGit =
      normalizedTools.some((tool) => tool.includes("git")) ||
      lowerBody.includes("git") ||
      lowerBody.includes("commit") ||
      lowerBody.includes("branch");
    capabilities.needsCodeSearch =
      normalizedTools.some((tool) => tool.includes("search") || tool.includes("grep")) ||
      lowerBody.includes("search") ||
      lowerBody.includes("find") ||
      lowerBody.includes("grep");
    capabilities.providesAnalysis =
      lowerBody.includes("analyz") || lowerBody.includes("review") || lowerBody.includes("audit");
    capabilities.providesCodeGeneration =
      lowerBody.includes("implement") || lowerBody.includes("create") || lowerBody.includes("generate");
    capabilities.providesRefactoring =
      lowerBody.includes("refactor") || lowerBody.includes("restructure");
    capabilities.providesDocumentation =
      lowerBody.includes("document") || lowerBody.includes("readme") || lowerBody.includes("spec");

    return capabilities;
  }

  private inferSafetyLevel(
    fm: OpenCodeFrontmatter,
    capabilities: CapabilitySet,
  ): "safe" | "sensitive" | "dangerous" {
    if (fm.permission === "allow" && capabilities.needsShell) {
      return "dangerous";
    }

    if (
      fm.permission === "allow" ||
      capabilities.needsShell ||
      capabilities.needsNetwork ||
      capabilities.needsGit
    ) {
      return "sensitive";
    }

    return "safe";
  }

  private createArguments(argumentsList?: string[]): ArgumentSpec[] | undefined {
    if (!Array.isArray(argumentsList) || argumentsList.length === 0) {
      return undefined;
    }

    return argumentsList.map((name) => ({
      name,
      required: true,
    }));
  }

  private createArgumentHint(argumentsList?: string[]): string | undefined {
    if (!Array.isArray(argumentsList) || argumentsList.length === 0) {
      return undefined;
    }

    return argumentsList.map((name) => `<${name}>`).join(" ");
  }

  private extractDescriptionFromBody(body: string): string | undefined {
    const lines = body.split("\n").filter((line) => line.trim().length > 0);
    const firstContentLine = lines.find((line) => !line.startsWith("#"));
    return firstContentLine?.trim().slice(0, 200);
  }
}
