/**
 * Renderer interface and base implementation
 */

import type {
  AgentId,
  ComponentSpec,
  RenderResult,
  ConversionReport,
} from "../core/types.js";
import {
  adaptVersion,
  needsAdaptation,
  getDefaultTargetVersion,
} from "../versioning/version-adapter.js";
import { validate, type ValidationResult } from "../validation/index.js";

export interface RenderOptions {
  includeComments?: boolean;
  preserveOriginalMetadata?: boolean;
  /** Target version for version-specific rendering */
  targetVersion?: string;
  /** Source version (for adaptation) */
  sourceVersion?: string;
  /** Validate output after rendering */
  validateOutput?: boolean;
  /** Strict validation mode */
  strictValidation?: boolean;
}

export interface AgentRenderer {
  readonly agentId: AgentId;

  render(spec: ComponentSpec, options?: RenderOptions): RenderResult;

  getTargetFilename(spec: ComponentSpec): string;

  getTargetDirectory(spec: ComponentSpec): string;
}

export abstract class BaseRenderer implements AgentRenderer {
  abstract readonly agentId: AgentId;

  abstract render(spec: ComponentSpec, options?: RenderOptions): RenderResult;

  abstract getTargetFilename(spec: ComponentSpec): string;

  abstract getTargetDirectory(spec: ComponentSpec): string;

  /**
   * Apply version adaptation to the component body if needed
   */
  protected adaptForVersion(
    body: string,
    options?: RenderOptions,
  ): { body: string; adapted: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const targetVersion =
      options?.targetVersion ?? getDefaultTargetVersion(this.agentId);
    const sourceVersion = options?.sourceVersion;

    if (
      !sourceVersion ||
      !needsAdaptation(this.agentId, sourceVersion, targetVersion)
    ) {
      return { body, adapted: false, warnings };
    }

    const result = adaptVersion(
      this.agentId,
      body,
      sourceVersion,
      targetVersion,
    );

    // Collect warnings from adaptation
    if (result.warnings.length > 0) {
      warnings.push(...result.warnings);
    }

    // Note any breaking changes
    if (result.hasBreakingChanges) {
      warnings.push(
        `Breaking changes encountered when adapting from v${sourceVersion} to v${targetVersion}`,
      );
    }

    // Add note about successful adaptation if any transformations were applied
    if (result.transformations.length > 0) {
      warnings.push(
        `Adapted from ${this.agentId} v${sourceVersion} to v${targetVersion}`,
      );
    }

    return {
      body: result.content,
      adapted: result.transformations.length > 0,
      warnings,
    };
  }

  /**
   * Get the target version for rendering
   */
  protected getTargetVersion(options?: RenderOptions): string {
    return options?.targetVersion ?? getDefaultTargetVersion(this.agentId);
  }

  protected createErrorResult(errors: string[]): RenderResult {
    return {
      success: false,
      errors,
    };
  }

  protected createSuccessResult(
    content: string,
    filename: string,
    report: ConversionReport,
  ): RenderResult {
    return {
      success: true,
      content,
      filename,
      errors: [],
      report,
    };
  }

  protected createConversionReport(
    spec: ComponentSpec,
    targetAgent: AgentId,
    startTime: number,
  ): Omit<
    ConversionReport,
    | "preservedSemantics"
    | "losses"
    | "warnings"
    | "suggestions"
    | "fidelityScore"
  > {
    return {
      source: {
        agent: spec.sourceAgent?.id ?? "claude",
        componentType: spec.componentType,
        id: spec.id,
      },
      target: {
        agent: targetAgent,
        componentType: this.mapComponentType(spec.componentType, targetAgent),
        id: spec.id,
      },
      convertedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }

  protected mapComponentType(
    sourceType: ComponentSpec["componentType"],
    _targetAgent: AgentId,
  ): ComponentSpec["componentType"] {
    // Default mapping - subclasses can override
    const mappings: Record<string, ComponentSpec["componentType"]> = {
      skill: "skill",
      workflow: "workflow",
      command: "command",
    };
    return mappings[sourceType] ?? sourceType;
  }

  /**
   * Validate rendered output using the validation framework
   */
  protected validateOutput(
    content: string,
    componentType: ComponentSpec["componentType"],
    options?: { version?: string; strict?: boolean }
  ): ValidationResult {
    return validate(content, this.agentId, componentType, options);
  }
}
