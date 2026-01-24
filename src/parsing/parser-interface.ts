/**
 * Parser interface and base implementation
 */

import type { AgentId, ComponentSpec, ParseResult } from "../core/types.js";
import type { VersionDetectionResult } from "../versioning/types.js";

export interface ParserOptions {
  strict?: boolean;
  inferCapabilities?: boolean;
  sourceFile?: string;
  /** Explicit source version (overrides detection) */
  sourceVersion?: string;
}

export interface AgentParser {
  readonly agentId: AgentId;

  parse(content: string, options?: ParserOptions): ParseResult;

  canParse(content: string, filename?: string): boolean;

  /**
   * Detect the version of the content
   * Returns a VersionDetectionResult with version, confidence, and matched markers
   */
  detectVersion(content: string, filePath?: string): VersionDetectionResult;
}

export abstract class BaseParser implements AgentParser {
  abstract readonly agentId: AgentId;

  abstract parse(content: string, options?: ParserOptions): ParseResult;

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

  protected createErrorResult(errors: string[]): ParseResult {
    return {
      success: false,
      errors,
      warnings: [],
    };
  }

  protected createSuccessResult(
    spec: ComponentSpec,
    warnings: string[] = [],
  ): ParseResult {
    return {
      success: true,
      spec,
      errors: [],
      warnings,
    };
  }
}
