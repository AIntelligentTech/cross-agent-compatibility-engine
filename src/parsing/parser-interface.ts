/**
 * Parser interface and base implementation
 */

import type { AgentId, ComponentSpec, ParseResult } from '../core/types.js';

export interface ParserOptions {
  strict?: boolean;
  inferCapabilities?: boolean;
  sourceFile?: string;
}

export interface AgentParser {
  readonly agentId: AgentId;

  parse(content: string, options?: ParserOptions): ParseResult;

  canParse(content: string, filename?: string): boolean;

  detectVersion(content: string): string | undefined;
}

export abstract class BaseParser implements AgentParser {
  abstract readonly agentId: AgentId;

  abstract parse(content: string, options?: ParserOptions): ParseResult;

  abstract canParse(content: string, filename?: string): boolean;

  detectVersion(_content: string): string | undefined {
    return undefined;
  }

  protected createErrorResult(errors: string[]): ParseResult {
    return {
      success: false,
      errors,
      warnings: [],
    };
  }

  protected createSuccessResult(spec: ComponentSpec, warnings: string[] = []): ParseResult {
    return {
      success: true,
      spec,
      errors: [],
      warnings,
    };
  }
}
