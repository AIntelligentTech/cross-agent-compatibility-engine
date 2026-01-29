/**
 * Validation system index
 * Registers all agent validators and exports validation utilities
 */

export { BaseValidator, ValidatorRegistry, globalValidatorRegistry } from './validator-framework.js';
export type { ValidationIssue, ValidationResult, ValidatorOptions } from './validator-framework.js';

// Import and register all validators
import { globalValidatorRegistry } from './validator-framework.js';
import { ClaudeValidator } from './agents/claude-validator.js';
import { CursorValidator } from './agents/cursor-validator.js';
import { WindsurfValidator } from './agents/windsurf-validator.js';
import { OpenCodeValidator } from './agents/opencode-validator.js';
import { CodexValidator } from './agents/codex-validator.js';
import { GeminiValidator } from './agents/gemini-validator.js';

// Register all validators
export function registerAllValidators(): void {
  globalValidatorRegistry.register(new ClaudeValidator());
  globalValidatorRegistry.register(new CursorValidator());
  globalValidatorRegistry.register(new WindsurfValidator());
  globalValidatorRegistry.register(new OpenCodeValidator());
  globalValidatorRegistry.register(new CodexValidator());
  globalValidatorRegistry.register(new GeminiValidator());
}

// Auto-register on import
registerAllValidators();

// Export validators for direct use
export { ClaudeValidator } from './agents/claude-validator.js';
export { CursorValidator } from './agents/cursor-validator.js';
export { WindsurfValidator } from './agents/windsurf-validator.js';
export { OpenCodeValidator } from './agents/opencode-validator.js';
export { CodexValidator } from './agents/codex-validator.js';
export { GeminiValidator } from './agents/gemini-validator.js';

// Convenience validation function
import type { AgentId, ComponentType } from '../core/types.js';

export function validate(
  content: string,
  agent: AgentId,
  componentType: ComponentType,
  options?: import('./validator-framework.js').ValidatorOptions
): import('./validator-framework.js').ValidationResult {
  return globalValidatorRegistry.validate(content, agent, componentType, options);
}

export function validateClaudeSkill(
  content: string,
  version?: string,
  strict?: boolean
): import('./validator-framework.js').ValidationResult {
  return validate(content, 'claude', 'skill', { version, strict });
}

export function validateCursorRule(
  content: string,
  version?: string,
  strict?: boolean
): import('./validator-framework.js').ValidationResult {
  return validate(content, 'cursor', 'rule', { version, strict });
}

export function validateWindsurfSkill(
  content: string,
  version?: string,
  strict?: boolean
): import('./validator-framework.js').ValidationResult {
  return validate(content, 'windsurf', 'skill', { version, strict });
}

export function validateOpenCodeCommand(
  content: string,
  version?: string,
  strict?: boolean
): import('./validator-framework.js').ValidationResult {
  return validate(content, 'opencode', 'command', { version, strict });
}

export function validateCodexSkill(
  content: string,
  version?: string,
  strict?: boolean
): import('./validator-framework.js').ValidationResult {
  return validate(content, 'codex', 'skill', { version, strict });
}

export function validateGeminiSkill(
  content: string,
  version?: string,
  strict?: boolean
): import('./validator-framework.js').ValidationResult {
  return validate(content, 'gemini', 'skill', { version, strict });
}
