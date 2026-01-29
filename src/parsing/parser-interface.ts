/**
 * Parser interface and base implementation
 * Now with integrated validation support
 */

import type { AgentId, ComponentSpec, ParseResult } from "../core/types.js";
import type { VersionDetectionResult } from "../versioning/types.js";
import { validate, type ValidationResult } from "../validation/index.js";

export interface ParserOptions {
  strict?: boolean;
  inferCapabilities?: boolean;
  sourceFile?: string;
  /** Explicit source version (overrides detection) */
  sourceVersion?: string;
  /** Enable validation during parsing */
  validateOnParse?: boolean;
  /** Use strict validation mode */
  strictValidation?: boolean;
}

export interface ParseResultWithValidation extends ParseResult {
  validation?: ValidationResult;
}

export interface AgentParser {
  readonly agentId: AgentId;

  parse(content: string, options?: ParserOptions): ParseResultWithValidation;

  canParse(content: string, filename?: string): boolean;

  /**
   * Detect the version of the content
   * Returns a VersionDetectionResult with version, confidence, and matched markers
   */
  detectVersion(content: string, filePath?: string): VersionDetectionResult;
}

export abstract class BaseParser implements AgentParser {
  abstract readonly agentId: AgentId;

  abstract parse(content: string, options?: ParserOptions): ParseResultWithValidation;

  abstract canParse(content: string, filename?: string): boolean;

  /**
   * Default version detection - subclasses should override
   */
  detectVersion(_content: string, _filePath?: string): VersionDetectionResult {
    return {
      version: "1.0",
      confidence: 30,
      matchedMarkers: [],
      isDefinitive: false,
    };
  }

  protected createErrorResult(
    errors: string[],
    validation?: ValidationResult
  ): ParseResultWithValidation {
    return {
      success: false,
      errors,
      warnings: [],
      validation,
    };
  }

  protected createSuccessResult(
    spec: ComponentSpec,
    warnings: string[] = [],
    validation?: ValidationResult
  ): ParseResultWithValidation {
    return {
      success: true,
      spec,
      errors: [],
      warnings,
      validation,
    };
  }

  /**
   * Validate parsed content using the validation framework
   */
  protected validateContent(
    content: string,
    componentType: ComponentSpec['componentType'],
    options?: { version?: string; strict?: boolean }
  ): ValidationResult {
    return validate(content, this.agentId, componentType, {
      version: options?.version,
      strict: options?.strict,
    });
  }
}
