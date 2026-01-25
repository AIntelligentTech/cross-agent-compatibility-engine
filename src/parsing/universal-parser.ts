/**
 * Universal (AGENTS.md) Parser
 *
 * Wraps the memory parser to implement the standard AgentParser interface.
 * AGENTS.md is a cross-agent standard for providing context to AI coding assistants.
 */

import type { ParseResult } from "../core/types.js";
import { BaseParser, type ParserOptions } from "./parser-interface.js";
import {
  isAgentsMd,
  parseUniversalMemory,
} from "./memory/universal-memory-parser.js";

export class UniversalParser extends BaseParser {
  readonly agentId = "universal" as const;

  canParse(content: string, filename?: string): boolean {
    return isAgentsMd(content, { sourceFile: filename });
  }

  parse(content: string, options?: ParserOptions): ParseResult {
    return parseUniversalMemory(content, {
      sourceFile: options?.sourceFile,
    });
  }
}
