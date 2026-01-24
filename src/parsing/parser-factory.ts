/**
 * Parser factory for creating agent-specific parsers
 */

import type { AgentId, ParseResult } from '../core/types.js';
import type { AgentParser, ParserOptions } from './parser-interface.js';
import { ClaudeParser } from './claude-parser.js';
import { WindsurfParser } from './windsurf-parser.js';
import { CursorParser } from './cursor-parser.js';

const parsers: Map<AgentId, AgentParser> = new Map();

// Register default parsers
parsers.set('claude', new ClaudeParser());
parsers.set('windsurf', new WindsurfParser());
parsers.set('cursor', new CursorParser());

export function getParser(agentId: AgentId): AgentParser | undefined {
  return parsers.get(agentId);
}

export function registerParser(parser: AgentParser): void {
  parsers.set(parser.agentId, parser);
}

export function getSupportedParsers(): AgentId[] {
  return Array.from(parsers.keys());
}

export function detectAgent(content: string, filename?: string): AgentId | undefined {
  // First try to detect from filename
  if (filename) {
    if (filename.includes('.claude/')) return 'claude';
    if (filename.includes('.windsurf/')) return 'windsurf';
    if (filename.includes('.cursor/')) return 'cursor';
  }

  // Then try each parser's canParse method
  for (const [agentId, parser] of parsers) {
    if (parser.canParse(content, filename)) {
      return agentId;
    }
  }

  return undefined;
}

export function parseComponent(
  content: string,
  options?: ParserOptions & { agentId?: AgentId }
): ParseResult {
  const agentId = options?.agentId ?? detectAgent(content, options?.sourceFile);

  if (!agentId) {
    return {
      success: false,
      errors: ['Could not detect agent type. Please specify --from <agent>'],
      warnings: [],
    };
  }

  const parser = getParser(agentId);
  if (!parser) {
    return {
      success: false,
      errors: [`No parser available for agent: ${agentId}`],
      warnings: [],
    };
  }

  return parser.parse(content, options);
}
